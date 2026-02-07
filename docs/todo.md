# Project To-Do List

This file tracks tasks that are planned for the future but not yet prioritized for the current sprint/phase.

## Backend
- [ ] **Job: Cleanup Orphaned Images**
    - **Description**: Implement a Cron Job to physically delete image files from the `uploads` directory that are no longer referenced in the database (e.g. deleted declarations, replaced images).
    - **Resources**: Use `node-cron` or similar.
    - **Logic**: 
        1. Scan all files in `uploads/declarations`.
        2. Query all image URLs from `Declaration` table.
        3. Identify files not in the DB list.
        4. Delete them to free up space.
