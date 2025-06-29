import { Pool, PoolClient } from 'pg';
import bcrypt from 'bcryptjs';

// Your existing interfaces remain the same
export interface User {
  id: number;
  email: string;
  passwordhash: string;
  role: 'ADMIN' | 'ORG_USER';
  orgid?: number;
  createdat: string;
}

export interface Organization {
  id: number;
  name: string;
  contactEmail: string;
  createdAt: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  userId: number;
  orgId?: number;
  assignedAdminId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  content: string;
  ticketId: number;
  senderId: number;
  createdAt: string;
}

export interface AnalyticsData {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  ticketsByPriority: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  ticketsByMonth: Array<{ month: string; count: number }>;
  topOrganizations: Array<{ name: string; ticketCount: number }>;
  resolutionTrend: Array<{ date: string; resolved: number; created: number }>;
}

export interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  ticketUpdates: boolean;
  newMessages: boolean;
  theme: string;
  language: string;
  timezone: string;
}

export class DatabaseManager {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      user: process.env.PG_USER || 'postgres',
      host: process.env.PG_HOST || 'localhost',
      database: process.env.PG_DATABASE || 'support_tickets',
      password: process.env.PG_PASSWORD || 'postgres',
      port: parseInt(process.env.PG_PORT || '5432'),
    });

    this.initializeDatabase();
  }

  private async initializeDatabase() {
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await this.initializeTables(client);
      await this.seedData(client);
    } catch (error) {
      console.error('Error initializing database:', error);
    } finally {
      if (client) client.release();
    }
  }

  private async initializeTables(client: PoolClient) {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        contactEmail TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('ADMIN', 'ORG_USER')),
        orgId INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tickets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
        priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        orgId INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
        assignedAdminId INTEGER REFERENCES users(id) ON DELETE SET NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        ticketId INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        senderId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User settings table
    await client.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
      weekly_digest BOOLEAN NOT NULL DEFAULT FALSE,
      ticket_updates BOOLEAN NOT NULL DEFAULT TRUE,
      new_messages BOOLEAN NOT NULL DEFAULT TRUE,
      theme TEXT NOT NULL DEFAULT 'system',
      language TEXT NOT NULL DEFAULT 'en',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for better performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tickets_userId ON tickets(userId)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_ticketId ON messages(ticketId)`);
  }

  private async seedData(client: PoolClient) {
    // Check if admin already exists
    const adminExists = await client.query('SELECT id FROM users WHERE role = $1', ['ADMIN']);
    
    if (adminExists.rows.length === 0) {
      // Create demo organization
      const orgResult = await client.query(
        `INSERT INTO organizations (name, contactEmail) VALUES ($1, $2) RETURNING id`,
        ['Demo Corp', 'contact@democorp.com']
      );
      const orgId = orgResult.rows[0].id;

      // Create admin user
      const adminHash = await bcrypt.hash('admin123', 12);
      await client.query(
        `INSERT INTO users (email, passwordHash, role) VALUES ($1, $2, $3)`,
        ['admin@example.com', adminHash, 'ADMIN']
      );

      // Create demo user
      const userHash = await bcrypt.hash('user123', 12);
      const userResult = await client.query(
        `INSERT INTO users (email, passwordHash, role, orgId) VALUES ($1, $2, $3, $4) RETURNING id`,
        ['user@democorp.com', userHash, 'ORG_USER', orgId]
      );
      const userId = userResult.rows[0].id;

      // Create demo tickets
      await client.query(
        `INSERT INTO tickets (title, description, priority, userId, orgId) VALUES ($1, $2, $3, $4, $5)`,
        [
          'Unable to access dashboard',
          'I cannot log into my account dashboard. Getting error 500.',
          'HIGH',
          userId,
          orgId
        ]
      );

      await client.query(
        `INSERT INTO tickets (title, description, priority, userId, orgId) VALUES ($1, $2, $3, $4, $5)`,
        [
          'Feature request: Dark mode',
          'Would love to see a dark mode option in the application.',
          'LOW',
          userId,
          orgId
        ]
      );

      console.log('✅ Demo data seeded successfully');
    }
  }

  // User methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] as User | undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] as User | undefined;
  }

  async createUser(email: string, passwordHash: string, role: 'ADMIN' | 'ORG_USER', orgId?: number): Promise<User> {
    const result = await this.pool.query(
      `INSERT INTO users (email, passwordHash, role, orgId) VALUES ($1, $2, $3, $4) RETURNING *`,
      [email, passwordHash, role, orgId || null]
    );
    return result.rows[0] as User;
  }

  // Organization methods
  async createOrganization(name: string, contactEmail: string): Promise<Organization> {
    const result = await this.pool.query(
      `INSERT INTO organizations (name, contactEmail) VALUES ($1, $2) RETURNING *`,
      [name, contactEmail]
    );
    return result.rows[0] as Organization;
  }

  async getOrganizationById(id: number): Promise<Organization | undefined> {
    const result = await this.pool.query('SELECT * FROM organizations WHERE id = $1', [id]);
    return result.rows[0] as Organization | undefined;
  }

  // Ticket methods
  async createTicket(data: { title: string; description: string; priority: string; userId: number; orgId?: number }): Promise<Ticket> {
    const result = await this.pool.query(
      `INSERT INTO tickets (title, description, priority, userId, orgId) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.title, data.description, data.priority, data.userId, data.orgId || null]
    );
    return result.rows[0] as Ticket;
  }

  async getTicketById(id: number): Promise<Ticket | undefined> {
    const result = await this.pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    return result.rows[0] as Ticket | undefined;
  }

  async getTicketsByUserId(userId: number): Promise<Ticket[]> {
    const result = await this.pool.query('SELECT * FROM tickets WHERE userId = $1 ORDER BY createdAt DESC', [userId]);
    return result.rows as Ticket[];
  }

  async getAllTickets(filters?: { status?: string; priority?: string }): Promise<Ticket[]> {
    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND status = $' + (params.length + 1);
      params.push(filters.status);
    }

    if (filters?.priority) {
      query += ' AND priority = $' + (params.length + 1);
      params.push(filters.priority);
    }

    query += ' ORDER BY createdAt DESC';

    const result = await this.pool.query(query, params);
    return result.rows as Ticket[];
  }

  async updateTicketStatus(id: number, status: string, assignedAdminId?: number): Promise<void> {
    await this.pool.query(
      `UPDATE tickets SET status = $1, assignedAdminId = $2, updatedAt = CURRENT_TIMESTAMP WHERE id = $3`,
      [status, assignedAdminId || null, id]
    );
  }

  // Message methods
  async createMessage(content: string, ticketId: number, senderId: number): Promise<Message> {
    const result = await this.pool.query(
      `INSERT INTO messages (content, ticketId, senderId) VALUES ($1, $2, $3) RETURNING *`,
      [content, ticketId, senderId]
    );
    return result.rows[0] as Message;
  }

  async getMessagesByTicketId(ticketId: number): Promise<Message[]> {
    const result = await this.pool.query('SELECT * FROM messages WHERE ticketId = $1 ORDER BY createdAt ASC', [ticketId]);
    return result.rows as Message[];
  }

  // Enhanced queries with joins
  async getTicketWithUserInfo(id: number) {
    const result = await this.pool.query(`
      SELECT 
        t.*,
        u.email as "userEmail",
        o.name as "organizationName",
        admin.email as "assignedAdminEmail"
      FROM tickets t
      LEFT JOIN users u ON t.userId = u.id
      LEFT JOIN organizations o ON t.orgId = o.id
      LEFT JOIN users admin ON t.assignedAdminId = admin.id
      WHERE t.id = $1
    `, [id]);
    return result.rows[0];
  }

  async getAllTicketsWithInfo(filters?: { 
  status?: string; 
  priority?: string 
}): Promise<Ticket[]> {
  try {
    let query = `
      SELECT 
        t.*,
        u.email as "userEmail",
        o.name as "organizationName",
        admin.email as "assignedAdminEmail"
      FROM tickets t
      LEFT JOIN users u ON t.userId = u.id
      LEFT JOIN organizations o ON t.orgId = o.id
      LEFT JOIN users admin ON t.assignedAdminId = admin.id
      WHERE 1=1
    `;
    
    const params: string[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.priority) {
      query += ` AND t.priority = $${paramIndex++}`;
      params.push(filters.priority);
    }

    query += ' ORDER BY t.createdAt DESC';

    const result = await this.pool.query(query, params);
    return result.rows || []; // Always return an array
  } catch (error) {
    console.error('Database error in getAllTicketsWithInfo:', error);
    return [];
  }
}

  async getMessagesWithUserInfo(ticketId: number) {
    const result = await this.pool.query(`
      SELECT 
        m.*,
        u.email as "senderEmail",
        u.role as "senderRole"
      FROM messages m
      LEFT JOIN users u ON m.senderId = u.id
      WHERE m.ticketId = $1
      ORDER BY m.createdAt ASC
    `, [ticketId]);
    return result.rows;
  }

  async getAnalyticsData(range: string = '30d'): Promise<AnalyticsData> {
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
        case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
        case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
        case '1y':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            startDate.setDate(now.getDate() - 30);
    }

    // Get basic ticket statistics
    const [totalTickets, openTickets, inProgressTickets, resolvedTickets] = await Promise.all([
        this.pool.query('SELECT COUNT(*) as count FROM tickets'),
        this.pool.query('SELECT COUNT(*) as count FROM tickets WHERE status = $1', ['OPEN']),
        this.pool.query('SELECT COUNT(*) as count FROM tickets WHERE status = $1', ['IN_PROGRESS']),
        this.pool.query('SELECT COUNT(*) as count FROM tickets WHERE status = $1', ['RESOLVED'])
    ]);

    // Get tickets by priority
    const priorityStats = await this.pool.query(`
        SELECT priority, COUNT(*) as count 
        FROM tickets 
        WHERE createdAt >= $1 
        GROUP BY priority
    `, [startDate.toISOString()]);

    const ticketsByPriority = {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
    };

    priorityStats.rows.forEach((stat: any) => {
        ticketsByPriority[stat.priority as keyof typeof ticketsByPriority] = parseInt(stat.count);
    });

    // Get monthly ticket data
    const monthlyStats = await this.pool.query(`
        SELECT 
            TO_CHAR(createdAt, 'Mon') as month,
            COUNT(*) as count
        FROM tickets
        WHERE createdAt >= $1
        GROUP BY TO_CHAR(createdAt, 'Mon'), EXTRACT(MONTH FROM createdAt)
        ORDER BY EXTRACT(MONTH FROM createdAt)
    `, [startDate.toISOString()]);

    // Get resolution trend (last 5 days)
    const resolutionTrend = await this.pool.query(`
        SELECT 
            DATE(createdAt) as date,
            SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
            COUNT(*) as created
        FROM tickets
        WHERE createdAt >= CURRENT_DATE - INTERVAL '5 days'
        GROUP BY DATE(createdAt)
        ORDER BY DATE(createdAt)
    `);

    // Get top organizations
    const topOrganizations = await this.pool.query(`
        SELECT o.name, COUNT(t.id) as ticketCount
        FROM organizations o
        LEFT JOIN tickets t ON o.id = t.orgId
        WHERE t.createdAt >= $1
        GROUP BY o.id, o.name
        ORDER BY ticketCount DESC
        LIMIT 5
    `, [startDate.toISOString()]);

    // Calculate actual average resolution time (in days)
    const avgResolutionResult = await this.pool.query(`
        SELECT 
            AVG(EXTRACT(EPOCH FROM (updatedAt - createdAt))/86400) as avg_days
        FROM tickets
        WHERE status = 'RESOLVED'
        AND createdAt >= $1
    `, [startDate.toISOString()]);

    const avgResolutionTime = parseFloat(avgResolutionResult.rows[0]?.avg_days || '0');

    return {
        totalTickets: parseInt(totalTickets.rows[0].count),
        openTickets: parseInt(openTickets.rows[0].count),
        inProgressTickets: parseInt(inProgressTickets.rows[0].count),
        resolvedTickets: parseInt(resolvedTickets.rows[0].count),
        avgResolutionTime,
        ticketsByPriority,
        ticketsByMonth: monthlyStats.rows.map(row => ({
            month: row.month,
            count: parseInt(row.count)
        })),
        topOrganizations: topOrganizations.rows,
        resolutionTrend: resolutionTrend.rows.map(row => ({
            date: row.date.toISOString().split('T')[0],
            resolved: parseInt(row.resolved),
            created: parseInt(row.created)
        }))
    };
}

  // Analytics methods
  // async getAnalyticsData(range: string = '30d'): Promise<AnalyticsData> {
  //   // Calculate date range
  //   const now = new Date();
  //   let startDate = new Date();
    
  //   switch (range) {
  //     case '7d':
  //       startDate.setDate(now.getDate() - 7);
  //       break;
  //     case '30d':
  //       startDate.setDate(now.getDate() - 30);
  //       break;
  //     case '90d':
  //       startDate.setDate(now.getDate() - 90);
  //       break;
  //     case '1y':
  //       startDate.setFullYear(now.getFullYear() - 1);
  //       break;
  //     default:
  //       startDate.setDate(now.getDate() - 30);
  //   }

  //   // Get basic ticket statistics
  //   const totalTickets = await this.pool.query('SELECT COUNT(*) as count FROM tickets');
  //   const openTickets = await this.pool.query('SELECT COUNT(*) as count FROM tickets WHERE status = $1', ['OPEN']);
  //   const inProgressTickets = await this.pool.query('SELECT COUNT(*) as count FROM tickets WHERE status = $1', ['IN_PROGRESS']);
  //   const resolvedTickets = await this.pool.query('SELECT COUNT(*) as count FROM tickets WHERE status = $1', ['RESOLVED']);

  //   // Get tickets by priority
  //   const priorityStats = await this.pool.query(`
  //     SELECT priority, COUNT(*) as count 
  //     FROM tickets 
  //     WHERE createdAt >= $1 
  //     GROUP BY priority
  //   `, [startDate.toISOString()]);

  //   const ticketsByPriority = {
  //     HIGH: 0,
  //     MEDIUM: 0,
  //     LOW: 0
  //   };

  //   priorityStats.rows.forEach((stat: any) => {
  //     ticketsByPriority[stat.priority as keyof typeof ticketsByPriority] = parseInt(stat.count);
  //   });

  //   // Get monthly ticket data (simplified for demo)
  //   const ticketsByMonth = [
  //     { month: 'Jan', count: 12 },
  //     { month: 'Feb', count: 19 },
  //     { month: 'Mar', count: 15 },
  //     { month: 'Apr', count: 22 },
  //     { month: 'May', count: 28 },
  //     { month: 'Jun', count: 31 }
  //   ];

  //   // Get top organizations
  //   const topOrganizations = await this.pool.query(`
  //     SELECT o.name, COUNT(t.id) as ticketCount
  //     FROM organizations o
  //     LEFT JOIN tickets t ON o.id = t.orgId
  //     WHERE t.createdAt >= $1
  //     GROUP BY o.id, o.name
  //     ORDER BY ticketCount DESC
  //     LIMIT 5
  //   `, [startDate.toISOString()]);

  //   // Calculate average resolution time (simplified)
  //   const avgResolutionTime = 2.5; // days

  //   return {
  //     totalTickets: parseInt(totalTickets.rows[0].count),
  //     openTickets: parseInt(openTickets.rows[0].count),
  //     inProgressTickets: parseInt(inProgressTickets.rows[0].count),
  //     resolvedTickets: parseInt(resolvedTickets.rows[0].count),
  //     avgResolutionTime,
  //     ticketsByPriority,
  //     ticketsByMonth,
  //     topOrganizations: topOrganizations.rows,
  //     resolutionTrend: [
  //       { date: '2024-01-01', resolved: 8, created: 12 },
  //       { date: '2024-01-02', resolved: 15, created: 10 },
  //       { date: '2024-01-03', resolved: 12, created: 8 },
  //       { date: '2024-01-04', resolved: 18, created: 14 },
  //       { date: '2024-01-05', resolved: 22, created: 16 }
  //     ]
  //   };
  // }

  // User management methods
  async getAllUsers(): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT 
        u.*,
        o.name as "organizationName",
        COUNT(t.id) as "ticketCount"
      FROM users u
      LEFT JOIN organizations o ON u.orgId = o.id
      LEFT JOIN tickets t ON u.id = t.userId
      GROUP BY u.id, o.name
      ORDER BY u.createdAt DESC
    `);

    // Remove password hashes from response
    return result.rows.map((user: any) => {
      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  async getUserSettings(userId: number): Promise<UserSettings> {
    // First try to get settings from database
    const result = await this.pool.query(`
        SELECT 
            email_notifications as "emailNotifications",
            push_notifications as "pushNotifications",
            weekly_digest as "weeklyDigest",
            ticket_updates as "ticketUpdates",
            new_messages as "newMessages",
            theme,
            language,
            timezone
        FROM user_settings
        WHERE user_id = $1
    `, [userId]);

    if (result.rows.length > 0) {
        return result.rows[0] as UserSettings;
    }

    // If no settings exist, return defaults and create record
    const defaultSettings: UserSettings = {
        emailNotifications: true,
        pushNotifications: true,
        weeklyDigest: false,
        ticketUpdates: true,
        newMessages: true,
        theme: 'system',
        language: 'en',
        timezone: 'UTC'
    };

    // Create settings record for this user
    await this.pool.query(`
        INSERT INTO user_settings (
            user_id,
            email_notifications,
            push_notifications,
            weekly_digest,
            ticket_updates,
            new_messages,
            theme,
            language,
            timezone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
        userId,
        defaultSettings.emailNotifications,
        defaultSettings.pushNotifications,
        defaultSettings.weeklyDigest,
        defaultSettings.ticketUpdates,
        defaultSettings.newMessages,
        defaultSettings.theme,
        defaultSettings.language,
        defaultSettings.timezone
    ]);

    return defaultSettings;
}

async updateUserSettings(userId: number, settings: Partial<UserSettings>): Promise<void> {
    await this.pool.query(`
        INSERT INTO user_settings (
            user_id,
            email_notifications,
            push_notifications,
            weekly_digest,
            ticket_updates,
            new_messages,
            theme,
            language,
            timezone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) 
        DO UPDATE SET
            email_notifications = EXCLUDED.email_notifications,
            push_notifications = EXCLUDED.push_notifications,
            weekly_digest = EXCLUDED.weekly_digest,
            ticket_updates = EXCLUDED.ticket_updates,
            new_messages = EXCLUDED.new_messages,
            theme = EXCLUDED.theme,
            language = EXCLUDED.language,
            timezone = EXCLUDED.timezone
    `, [
        userId,
        settings.emailNotifications,
        settings.pushNotifications,
        settings.weeklyDigest,
        settings.ticketUpdates,
        settings.newMessages,
        settings.theme,
        settings.language,
        settings.timezone
    ]);
}

  async updateUserPassword(userId: number, newPasswordHash: string): Promise<void> {
    await this.pool.query('UPDATE users SET passwordHash = $1 WHERE id = $2', [newPasswordHash, userId]);
  }
}