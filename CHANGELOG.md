### [2.1.0] - "The Curated Broadcast" - 2025-10-09

This release introduces a revolutionary new approval workflow, giving administrators full control over the daily content before it reaches users. It also includes significant improvements to user management and content variety.

#### ✨ New Features

*   **👨‍💼 Admin Approval Workflow**: Implemented a two-stage broadcast system.
    *   **Nightly Preparation**: The bot now prepares the daily content at night and sends it to the admin for review via an interactive inline keyboard.
    *   **Morning Broadcast**: Only after explicit admin approval is the content forwarded to all users, ensuring quality and accuracy.
*   **🔄 Interactive Admin Controls**: Added new inline keyboard buttons for `Approve`, `Retry`, and `Skip`, allowing for quick and easy content management directly from Telegram.
*   **🧹 Smart User Management**: The broadcast system now automatically detects and skips users who have blocked the bot, preventing errors and improving delivery reports.

#### ⚙️ Changes & Improvements

*   **🎲 Content Shuffling**: The pool of available objects has been shuffled to provide more variety and prevent repetitive content from similar categories appearing consecutively.
*   **📬 True Message Forwarding**: The morning broadcast now uses the `copyMessage` API to send the exact approved message, preserving its original feel and formatting.
*   **🤖 Enhanced Reliability**: The approval workflow acts as a failsafe. If the admin does not approve a message, the system will fall back to the last approved content, ensuring a broadcast is never missed.

#### 💥 Breaking Changes

*   The daily broadcast is no longer fully automated. It now requires manual admin approval to proceed.
*   The `wrangler.jsonc` file now requires two cron triggers to be configured for the new two-stage workflow.

#### 🛠️ Under the Hood

*   Introduced the use of Telegram Callback Queries to handle inline keyboard button presses.
*   The `handleScheduled` function has been split into `handleScheduled` and `handlePrepareScheduled` to manage the new workflow.
*   Added a new `PREPARATION_KV` namespace to store the `message_id` of the approved content for forwarding.
*   The `copyMessage` function was replaced with `sendMediaGroupToUser` in the morning broadcast to ensure the full media group is sent, as `sendMediaGroupToUser` can run into problems.