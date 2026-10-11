import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Start recording video
        await context.tracing.start(screenshots=True, snapshots=True)

        print("Navigating to http://localhost:3000...")
        await page.goto('http://localhost:3000', wait_until='networkidle')

        print("Waiting for auth UI...")
        try:
            await page.wait_for_selector('input[type="email"]', timeout=5000)

            print("Filling auth form...")
            await page.fill('input[type="email"]', 'testuser2@example.com')

            # Check if there is a username field
            username_input = await page.query_selector('input[placeholder="Username"]')
            if username_input:
                await page.fill('input[placeholder="Username"]', 'testuser2')

            password_inputs = await page.query_selector_all('input[type="password"]')
            if password_inputs:
                await password_inputs[-1].fill('password123')

            # Click the main continue button
            await page.click('button:has-text("Continue with Email")')

            print("Waiting for OTP...")
            # We might need to handle the OTP step or wait for the main UI
            # Wait a moment for network or UI changes
            await page.wait_for_timeout(3000)
            await page.screenshot(path='/home/jules/verification/screenshots/auth_after_click.png')

        except Exception as e:
            print(f"Auth form not found or error: {e}")

        # Try to screenshot the main UI
        print("Taking final screenshot...")
        await page.screenshot(path='/home/jules/verification/screenshots/final_ui.png')

        await context.tracing.stop(path='/home/jules/verification/videos/trace.zip')
        await browser.close()

asyncio.run(run())
