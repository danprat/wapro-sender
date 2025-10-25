# Supabase Backend Migration Guide

## Overview

This document outlines the process of migrating the existing WhatsApp bulk sender extension from a client-side only architecture (using local storage and bypassed API calls) to a Supabase-powered backend system. The migration introduces proper data persistence, user authentication, and scalable backend operations.

## Current System Analysis

The current extension operates entirely client-side:
- Configuration data is hardcoded in `prodata.js`
- User data stored in browser local storage
- API calls to external services are bypassed
- No persistent data storage or user management
- No backend for bulk operations or analytics

## Target Architecture

After migration:
- Supabase as the backend database and API layer
- User authentication via Supabase Auth
- Data persistence for configs, templates, contacts, and campaigns
- Edge Functions for server-side operations
- Row Level Security (RLS) for data protection

## Database Structure

### Tables Overview

1. **users** - User accounts and authentication
2. **configs** - User-specific configuration settings
3. **message_templates** - Reusable message templates
4. **contacts** - Contact lists for bulk messaging
5. **campaigns** - Bulk messaging campaigns
6. **campaign_messages** - Individual message status tracking

## SQL DDL for Tables

```sql
-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User configurations
CREATE TABLE configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Message templates
CREATE TABLE message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contact lists
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  phone TEXT NOT NULL,
  country_code TEXT DEFAULT '+62',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk messaging campaigns
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  template_id UUID REFERENCES message_templates(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'failed')),
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual campaign messages
CREATE TABLE campaign_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row Level Security (RLS) Policies

Enable RLS on all tables and create policies for secure data access:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Configs policies
CREATE POLICY "Users can view own configs" ON configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own configs" ON configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own configs" ON configs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own configs" ON configs
  FOR DELETE USING (auth.uid() = user_id);

-- Message templates policies
CREATE POLICY "Users can view own templates" ON message_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own templates" ON message_templates
  FOR ALL USING (auth.uid() = user_id);

-- Contacts policies
CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own contacts" ON contacts
  FOR ALL USING (auth.uid() = user_id);

-- Campaigns policies
CREATE POLICY "Users can view own campaigns" ON campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own campaigns" ON campaigns
  FOR ALL USING (auth.uid() = user_id);

-- Campaign messages policies
CREATE POLICY "Users can view own campaign messages" ON campaign_messages
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM campaigns WHERE id = campaign_id)
  );

CREATE POLICY "Users can manage own campaign messages" ON campaign_messages
  FOR ALL USING (
    auth.uid() = (SELECT user_id FROM campaigns WHERE id = campaign_id)
  );
```

## Edge Functions

Create the following Edge Functions for backend operations:

### 1. authenticate_user
- Handles user login/signup
- Returns JWT token for API access

### 2. save_config
- Saves user configuration settings
- Parameters: key, value
- Updates or inserts config records

### 3. get_templates
- Retrieves user's message templates
- Returns array of templates with variables

### 4. create_campaign
- Creates a new bulk messaging campaign
- Parameters: name, template_id, contact_ids
- Returns campaign ID

### 5. send_bulk_messages
- Processes bulk message sending
- Parameters: campaign_id
- Updates campaign_messages status
- Integrates with WhatsApp API (if available) or queues for manual sending

### 6. update_campaign_status
- Updates campaign progress
- Parameters: campaign_id, status updates

### 7. get_contacts
- Retrieves user's contact list
- Supports filtering by tags

### 8. import_contacts
- Bulk import contacts from CSV
- Validates phone numbers
- Parameters: csv_data

## Migration Steps

1. **Setup Supabase Project**
   - Create new Supabase project
   - Enable authentication
   - Configure database settings

2. **Create Database Schema**
   - Run the SQL DDL statements above
   - Enable RLS and create policies

3. **Deploy Edge Functions**
   - Create functions in Supabase dashboard
   - Implement business logic for each function

4. **Update Extension Code**
   - Replace local storage calls with Supabase client
   - Add authentication flow
   - Update config loading to use database
   - Modify message sending to use campaigns

5. **Testing**
   - Test authentication flow
   - Verify data persistence
   - Test bulk messaging campaigns
   - Validate RLS policies

## Integration with Extension

Update the following files:

- **manifest.json**: Add Supabase client permissions
- **js/procntt.js**: Replace fetchConfigData with Supabase calls
- **js/promsg.js**: Integrate campaign creation and message sending
- **popup.html**: Add login UI and campaign management

## Security Considerations

- All data access protected by RLS
- JWT tokens for API authentication
- Rate limiting on Edge Functions
- Input validation and sanitization
- CORS configuration for extension origin

## Performance Optimizations

- Database indexes on frequently queried columns
- Pagination for large contact lists
- Caching strategies for templates and configs
- Background processing for bulk operations

## Monitoring and Maintenance

- Supabase dashboard for database monitoring
- Edge Function logs for debugging
- User activity tracking
- Backup and recovery procedures