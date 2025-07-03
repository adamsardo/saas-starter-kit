import { prisma } from '../lib/prisma';
import { createClerkClient } from '@clerk/backend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

interface MigrationResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

async function migrateUsers(): Promise<MigrationResult> {
  console.log('Starting user migration to Clerk...');
  
  const result: MigrationResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Fetch all users from database
    const users = await prisma.user.findMany({
      include: {
        teamMembers: {
          include: {
            team: true,
          },
        },
      },
    });

    console.log(`Found ${users.length} users to migrate`);

    // Process users in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (user) => {
          try {
            // Check if user already exists in Clerk
            const existingUsers = await clerkClient.users.getUserList({
              emailAddress: [user.email],
            });

            let clerkUser;
            
            if (existingUsers.data.length > 0) {
              console.log(`User ${user.email} already exists in Clerk`);
              clerkUser = existingUsers.data[0];
            } else {
              // Create user in Clerk
              clerkUser = await clerkClient.users.createUser({
                emailAddress: [user.email],
                firstName: user.name?.split(' ')[0] || '',
                lastName: user.name?.split(' ').slice(1).join(' ') || '',
                skipPasswordRequirement: true, // Users will need to reset password
                publicMetadata: {
                  migratedFromNextAuth: true,
                  originalUserId: user.id,
                },
              });

              console.log(`Created user ${user.email} in Clerk`);
            }

            // Update user in database with Clerk ID
            await prisma.user.update({
              where: { id: user.id },
              data: { 
                id: clerkUser.id, // Update to use Clerk's user ID
              },
            });

            // Migrate team memberships as organization memberships
            for (const membership of user.teamMembers) {
              try {
                // Check if organization exists
                let organization;
                try {
                  organization = await clerkClient.organizations.getOrganization({
                    organizationId: membership.team.id,
                  });
                } catch (error) {
                  // Create organization if it doesn't exist
                  organization = await clerkClient.organizations.createOrganization({
                    name: membership.team.name,
                    slug: membership.team.slug,
                    publicMetadata: {
                      migratedFromNextAuth: true,
                      originalTeamId: membership.team.id,
                    },
                  });

                  // Update team in database with Clerk organization ID
                  await prisma.team.update({
                    where: { id: membership.team.id },
                    data: { id: organization.id },
                  });

                  console.log(`Created organization ${organization.name}`);
                }

                // Add user to organization with appropriate role
                const clerkRole = membership.role === 'OWNER' 
                  ? 'org:owner' 
                  : membership.role === 'ADMIN' 
                    ? 'org:admin' 
                    : 'org:member';

                await clerkClient.organizations.createOrganizationMembership({
                  organizationId: organization.id,
                  userId: clerkUser.id,
                  role: clerkRole,
                });

                console.log(`Added ${user.email} to organization ${organization.name} as ${clerkRole}`);
              } catch (error) {
                console.error(`Failed to migrate team membership for ${user.email}:`, error);
              }
            }

            result.success++;
          } catch (error) {
            console.error(`Failed to migrate user ${user.email}:`, error);
            result.failed++;
            result.errors.push({
              email: user.email,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        })
      );

      // Add delay between batches to respect rate limits
      if (i + batchSize < users.length) {
        console.log(`Processed ${i + batchSize} users, waiting before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return result;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateUsers()
    .then((result) => {
      console.log('\nMigration completed!');
      console.log(`✅ Successfully migrated: ${result.success} users`);
      console.log(`❌ Failed: ${result.failed} users`);
      
      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(({ email, error }) => {
          console.log(`  - ${email}: ${error}`);
        });
      }
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateUsers };