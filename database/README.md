# Database Files

This directory contains all database-related files organized by purpose:

## 📁 Structure

### `/schema/`
Contains the main database structure and feature additions:
- `database-schema.sql` - Complete database structure with initial data
- `create-assessment-flags-table.sql` - Assessment flags feature table

### `/migrations/`
Contains database migration files for version control:
- `add-middle-name-migration.sql` - Added middle name field to students
- `add-invoice-numbers-migration.sql` - Added invoice number tracking

### `/maintenance/`
Contains utility scripts for database maintenance and debugging:
- `cleanup-orphaned-data.sql` - Removes orphaned financial records
- `debug-charges-query.sql` - Debugging script for charge calculations
- `clean-database-schema.sql` - Clean schema without sample data
- `cleanup-assessment-tables.sql` - Cleanup utility for assessment tables

## 🚀 Usage

### Setting up a new database:
```sql
-- Use the main schema file
mysql -u username -p < schema/database-schema.sql
```

### Adding new features:
```sql
-- Add assessment flags functionality
mysql -u username -p emsd_system < schema/create-assessment-flags-table.sql
```

### Applying migrations:
```sql
-- Apply migrations in chronological order
mysql -u username -p emsd_system < migrations/add-middle-name-migration.sql
mysql -u username -p emsd_system < migrations/add-invoice-numbers-migration.sql
```

### Maintenance tasks:
```sql
-- Clean up orphaned data
mysql -u username -p emsd_system < maintenance/cleanup-orphaned-data.sql
```
