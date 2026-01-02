/**
 * Test script for the Plugin SDK
 *
 * This script demonstrates and tests the core functionality of the Plugin SDK.
 * Run this after initializing the system to verify everything works correctly.
 */

import { createPlugin } from '../plugin-sdk';
import { createApp, createAuthorization } from '../db';

interface TestRecord {
  name: string;
  value: number;
  description?: string;
}

/**
 * Run all tests
 */
export async function runPluginTests(userId: string): Promise<void> {
  console.log('Starting Plugin SDK Tests...\n');

  try {
    // Setup: Create a test app
    console.log('1. Setting up test app...');
    await createApp(
      'test-plugin',
      'Test Plugin',
      '1.0.0',
      'Test Author',
      'test@example.com',
      'A test plugin for SDK validation'
    );

    await createAuthorization(
      'test-plugin:read',
      'Read Test Data',
      'Can read test data',
      'test-plugin'
    );

    await createAuthorization(
      'test-plugin:write',
      'Write Test Data',
      'Can write test data',
      'test-plugin'
    );

    console.log('✓ Test app created\n');

    // Test RecordManager
    await testRecordManager(userId);

    // Test SystemInterface
    await testSystemInterface(userId);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

/**
 * Test RecordManager functionality
 */
async function testRecordManager(userId: string): Promise<void> {
  console.log('2. Testing RecordManager...');

  const plugin = createPlugin<TestRecord>('test-plugin', userId);

  // Test: Create a record
  console.log('  - Testing create...');
  const record1 = await plugin.records.create({
    name: 'Test Record 1',
    value: 42,
    description: 'First test record',
  });
  console.log(`    Created record: ${record1.id}`);

  // Test: Read a record
  console.log('  - Testing read...');
  const readRecord = await plugin.records.read(record1.id);
  if (!readRecord) {
    throw new Error('Failed to read record');
  }
  console.log(`    Read record: ${readRecord.data.name}`);

  // Test: Update a record
  console.log('  - Testing update...');
  await plugin.records.update(record1.id, { value: 100 });
  const updatedRecord = await plugin.records.read(record1.id);
  if (updatedRecord?.data.value !== 100) {
    throw new Error('Failed to update record');
  }
  console.log(`    Updated value: ${updatedRecord.data.value}`);

  // Test: Batch create
  console.log('  - Testing batch create...');
  const batchRecords = await plugin.records.batchCreate([
    { name: 'Batch 1', value: 1 },
    { name: 'Batch 2', value: 2 },
    { name: 'Batch 3', value: 3 },
  ]);
  console.log(`    Created ${batchRecords.length} records`);

  // Test: List records
  console.log('  - Testing list...');
  const listResult = await plugin.records.list();
  console.log(`    Found ${listResult.total} total records`);

  // Test: Count records
  console.log('  - Testing count...');
  const count = await plugin.records.count();
  console.log(`    Count: ${count} records`);

  // Test: Exists
  console.log('  - Testing exists...');
  const exists = await plugin.records.exists(record1.id);
  if (!exists) {
    throw new Error('Record should exist');
  }
  console.log(`    Record exists: ${exists}`);

  // Test: Batch read
  console.log('  - Testing batch read...');
  const batchReadRecords = await plugin.records.batchRead([
    record1.id,
    batchRecords[0].id,
    'non-existent-id',
  ]);
  console.log(
    `    Batch read: ${batchReadRecords.filter((r) => r !== null).length} found, ${batchReadRecords.filter((r) => r === null).length} null`
  );

  // Test: Delete a record
  console.log('  - Testing delete...');
  const deleted = await plugin.records.delete(record1.id);
  if (!deleted) {
    throw new Error('Failed to delete record');
  }
  console.log(`    Deleted: ${deleted}`);

  // Test: Batch delete
  console.log('  - Testing batch delete...');
  const deletedCount = await plugin.records.batchDelete(
    batchRecords.map((r) => r.id)
  );
  console.log(`    Batch deleted: ${deletedCount} records`);

  // Cleanup: Delete all remaining test records
  console.log('  - Cleaning up...');
  const cleanupCount = await plugin.records.deleteAll();
  console.log(`    Cleaned up ${cleanupCount} records`);

  console.log('✓ RecordManager tests passed\n');
}

/**
 * Test SystemInterface functionality
 */
async function testSystemInterface(userId: string): Promise<void> {
  console.log('3. Testing SystemInterface...');

  const plugin = createPlugin('test-plugin', userId);

  // Test: Get apps
  console.log('  - Testing getApps...');
  const apps = await plugin.system.getApps();
  console.log(`    Found ${apps.length} apps`);
  if (apps.length === 0) {
    throw new Error('Should have at least one app');
  }

  // Test: Get app by ID
  console.log('  - Testing getApp...');
  const testApp = await plugin.system.getApp('test-plugin');
  if (!testApp) {
    throw new Error('Test app not found');
  }
  console.log(`    Found app: ${testApp.label}`);

  // Test: Get users
  console.log('  - Testing getUsers...');
  const users = await plugin.system.getUsers();
  console.log(`    Found ${users.length} active users`);

  // Test: Get user by ID
  console.log('  - Testing getUser...');
  const user = await plugin.system.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }
  console.log(`    Found user: ${user.username}`);

  // Test: Get my user info
  console.log('  - Testing getMyUserInfo...');
  const myInfo = await plugin.system.getMyUserInfo();
  if (!myInfo) {
    throw new Error('My user info not found');
  }
  console.log(`    My username: ${myInfo.username}`);

  // Test: Get authorities
  console.log('  - Testing getAuthorities...');
  const authorities = await plugin.system.getAuthorities();
  console.log(`    Found ${authorities.length} authorities`);

  // Test: Get authority by ID
  console.log('  - Testing getAuthority...');
  const adminAuthority = await plugin.system.getAuthority('admin');
  if (!adminAuthority) {
    throw new Error('Admin authority not found');
  }
  console.log(`    Found authority: ${adminAuthority.name}`);

  // Test: Get authorities with user count
  console.log('  - Testing getAuthoritiesWithUserCount...');
  const authsWithCount = await plugin.system.getAuthoritiesWithUserCount();
  console.log(
    `    Authorities with counts: ${authsWithCount.map((a) => `${a.name}(${a.userCount})`).join(', ')}`
  );

  // Test: Get authorizations
  console.log('  - Testing getAuthorizations...');
  const authorizations = await plugin.system.getAuthorizations();
  console.log(`    Found ${authorizations.length} authorizations`);

  // Test: Get my authorizations
  console.log('  - Testing getMyAuthorizations...');
  const myAuths = await plugin.system.getMyAuthorizations();
  console.log(`    My app has ${myAuths.length} authorizations`);

  // Test: Get authorization by ID
  console.log('  - Testing getAuthorization...');
  const adminAuth = await plugin.system.getAuthorization('admin');
  if (!adminAuth) {
    throw new Error('Admin authorization not found');
  }
  console.log(`    Found authorization: ${adminAuth.name}`);

  // Test: Get user authorizations
  console.log('  - Testing getUserAuthorizationIds...');
  const userAuthIds = await plugin.system.getUserAuthorizationIds(userId);
  console.log(`    User has ${userAuthIds.length} authorization(s)`);

  // Test: Get my authorization IDs
  console.log('  - Testing getMyAuthorizationIds...');
  const myAuthIds = await plugin.system.getMyAuthorizationIds();
  console.log(`    I have ${myAuthIds.length} authorization(s)`);

  // Test: Check user authorization
  console.log('  - Testing checkUserAuthorization...');
  const hasAdmin = await plugin.system.checkUserAuthorization(userId, 'admin');
  console.log(`    User has admin: ${hasAdmin}`);

  // Test: Check my authorization
  console.log('  - Testing checkMyAuthorization...');
  const iHaveAdmin = await plugin.system.checkMyAuthorization('admin');
  console.log(`    I have admin: ${iHaveAdmin}`);

  // Test: Get users by authority
  console.log('  - Testing getUsersByAuthority...');
  const usersByAuth = await plugin.system.getUsersByAuthority();
  console.log(
    `    Users by authority: ${Array.from(usersByAuth.entries())
      .map(([auth, count]) => `${auth}(${count})`)
      .join(', ')}`
  );

  console.log('✓ SystemInterface tests passed\n');
}

/**
 * Example of how to use this test
 *
 * import { runPluginTests } from '@/lib/examples/test-plugin';
 *
 * // Run tests with a user ID (usually the admin user)
 * await runPluginTests('admin-user-id');
 */
