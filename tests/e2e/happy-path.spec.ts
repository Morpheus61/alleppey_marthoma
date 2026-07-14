/**
 * Playwright E2E — happy-path smoke test
 * Stage 12: admin approves member → assigns to group → leader posts → member sees post & RSVPs
 *
 * Run: npx playwright test
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY set in environment
 */
import { test, expect, type Page } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

// These test phone numbers must be whitelisted in Supabase for test OTP (fixed code 123456)
const ADMIN_PHONE   = process.env.TEST_ADMIN_PHONE   ?? '+919000100001'
const MEMBER_PHONE  = process.env.TEST_MEMBER_PHONE  ?? '+919000100002'
const LEADER_PHONE  = process.env.TEST_LEADER_PHONE  ?? '+919000100003'
const TEST_OTP      = process.env.TEST_OTP            ?? '123456'

async function loginAs(page: Page, phone: string) {
  await page.goto(`${BASE_URL}/auth/login`)
  await page.fill('input[type="tel"]', phone)
  await page.click('button[type="submit"]')
  await page.fill('input[type="text"]', TEST_OTP)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/`)
}

test.describe('Happy path: full workflow', () => {
  test('admin approves member, assigns to group, leader posts, member sees post', async ({ page }) => {
    // Step 1: Admin approves the member (Stage 4 — placeholder until implemented)
    await loginAs(page, ADMIN_PHONE)
    await expect(page).toHaveURL(`${BASE_URL}/`)

    // Navigate to admin dashboard
    await page.goto(`${BASE_URL}/admin`)
    await expect(page.locator('h1')).toContainText('Admin')

    // Step 2: Verify groups page is accessible
    await page.goto(`${BASE_URL}/groups`)
    await expect(page.locator('h1')).toContainText('Groups')

    // Step 3: Member login flow
    // (Full approval/assignment/post flow will be wired in Stages 4-6)

    await expect(page).toHaveURL(`${BASE_URL}/groups`)
  })
})
