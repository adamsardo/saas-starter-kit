import { NextApiRequest, NextApiResponse } from 'next';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import env from '@/lib/env';
import { Role } from '@prisma/client';
import { CLERK_ROLES } from '@/lib/clerk-constants';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the webhook signature
  const webhookSecret = env.clerk.webhookSecret;
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const body = JSON.stringify(req.body);
  const wh = new Webhook(webhookSecret);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  // Handle different webhook events
  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id);
        
        if (!primaryEmail) {
          console.error('No primary email found for user', id);
          break;
        }

        // Check if user already exists by email
        const existingUser = await prisma.user.findUnique({
          where: { email: primaryEmail.email_address },
        });

        if (existingUser) {
          // Update existing user with Clerk ID
          await prisma.user.update({
            where: { email: primaryEmail.email_address },
            data: {
              clerkUserId: id,
              name: `${first_name || ''} ${last_name || ''}`.trim() || undefined,
              image: image_url,
              emailVerified: primaryEmail.verification?.status === 'verified' ? new Date() : null,
              migratedToClerk: true,
            },
          });
        } else {
          // Create new user
          await prisma.user.create({
            data: {
              clerkUserId: id,
              email: primaryEmail.email_address,
              name: `${first_name || ''} ${last_name || ''}`.trim() || '',
              image: image_url,
              emailVerified: primaryEmail.verification?.status === 'verified' ? new Date() : null,
              migratedToClerk: true,
            },
          });
        }
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;
        
        // Find user by Clerk ID
        const user = await prisma.user.findUnique({
          where: { clerkUserId: id },
        });

        if (user) {
          // Soft delete or handle according to your requirements
          await prisma.user.update({
            where: { clerkUserId: id },
            data: { 
              // You might want to add a deletedAt field instead of hard delete
              email: `deleted_${id}@deleted.local`,
            },
          });
        }
        break;
      }

      case 'organization.created': {
        const { id, name, slug, created_at } = evt.data;
        
        await prisma.team.create({
          data: {
            clerkOrgId: id,
            name,
            slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            createdAt: new Date(created_at),
            migratedToClerk: true,
          },
        });
        break;
      }

      case 'organization.updated': {
        const { id, name, slug } = evt.data;
        
        await prisma.team.update({
          where: { clerkOrgId: id },
          data: { 
            name,
            slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          },
        });
        break;
      }

      case 'organization.deleted': {
        const { id } = evt.data;
        
        // Delete team and all related data
        await prisma.team.delete({
          where: { clerkOrgId: id },
        });
        break;
      }

      case 'organizationMembership.created': {
        const { organization, public_user_data, role } = evt.data;
        
        // Find user by Clerk ID
        const user = await prisma.user.findUnique({
          where: { clerkUserId: public_user_data.user_id },
        });

        // Find team by Clerk organization ID
        const team = await prisma.team.findUnique({
          where: { clerkOrgId: organization.id },
        });

        if (!user || !team) {
          console.error('User or team not found for membership', {
            userId: public_user_data.user_id,
            orgId: organization.id,
          });
          break;
        }

        const mappedRole = CLERK_ROLES[role as keyof typeof CLERK_ROLES] || Role.MEMBER;

        // Check if membership already exists
        const existingMembership = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: team.id,
              userId: user.id,
            },
          },
        });

        if (!existingMembership) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              userId: user.id,
              role: mappedRole,
            },
          });
        }
        break;
      }

      case 'organizationMembership.updated': {
        const { organization, public_user_data, role } = evt.data;
        
        // Find user by Clerk ID
        const user = await prisma.user.findUnique({
          where: { clerkUserId: public_user_data.user_id },
        });

        // Find team by Clerk organization ID
        const team = await prisma.team.findUnique({
          where: { clerkOrgId: organization.id },
        });

        if (!user || !team) {
          console.error('User or team not found for membership update');
          break;
        }

        const mappedRole = CLERK_ROLES[role as keyof typeof CLERK_ROLES] || Role.MEMBER;

        await prisma.teamMember.update({
          where: {
            teamId_userId: {
              teamId: team.id,
              userId: user.id,
            },
          },
          data: {
            role: mappedRole,
          },
        });
        break;
      }

      case 'organizationMembership.deleted': {
        const { organization, public_user_data } = evt.data;
        
        // Find user by Clerk ID
        const user = await prisma.user.findUnique({
          where: { clerkUserId: public_user_data.user_id },
        });

        // Find team by Clerk organization ID
        const team = await prisma.team.findUnique({
          where: { clerkOrgId: organization.id },
        });

        if (!user || !team) {
          console.error('User or team not found for membership deletion');
          break;
        }

        await prisma.teamMember.delete({
          where: {
            teamId_userId: {
              teamId: team.id,
              userId: user.id,
            },
          },
        });
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${evt.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}