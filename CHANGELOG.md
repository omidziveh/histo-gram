## Changelog

All notable changes to this project will be documented in this file.

### [2.0.0] - "The TypeScript Overhaul" - 2025-10-06

This release marks a complete rewrite of the Histo-Gram bot, transitioning from a Python-based application to a modern, serverless architecture built on TypeScript and Cloudflare Workers. This version delivers unparalleled reliability, scalability, and maintainability.

#### ✨ New Features

*   **🤖 Serverless Architecture:** The entire backend has been rebuilt on Cloudflare Workers. This means the bot is now globally distributed, incredibly fast, and requires zero server maintenance.
*   **🧪 Admin Beta Testing Tools:** Introduced a suite of admin-only commands for easy testing and management.
    *   `/testbroadcast`: Instantly triggers the full broadcast pipeline for a single user.
    *   `/listusers`: Retrieves a list of all currently subscribed users.
    *   `/updateusernames`: Bulk-updates the database with the latest usernames for all users.
*   **📝 Intelligent Content Delivery:** The bot now sends a group of up to 4 images per artwork, providing a richer experience for the user.

#### ⚙️ Changes & Improvements

*   **🚀 Bulletproof Broadcasting:** The daily delivery system is now more resilient than ever.
    *   **Image Sending:** Switched from downloading and re-uploading images to sending image URLs directly. This completely eliminates CPU timeout errors and drastically speeds up delivery.
    *   **Smart Retries:** Implemented an intelligent retry mechanism that automatically removes a single failing image from a group and resends the rest, ensuring users always receive content.
    *   **Error Handling:** Added robust, top-level error handling to prevent webhook retry loops and ensure the system remains stable even when external APIs fail.
*   **🎨 Reliable Text Formatting:** Switched from `MarkdownV2` to `HTML` for message formatting. This provides a much more stable and forgiving way to send formatted text, preventing parsing errors from AI-generated content.
*   **⚡ Atomic Database Operations:** Updated database queries to use D1's `UPDATE...RETURNING` feature, ensuring that object selection and status updates are atomic and preventing race conditions.
*   **📊 Comprehensive Logging:** Integrated a centralized logging system throughout the application, making debugging and monitoring significantly easier.

#### 💥 Breaking Changes

*   **🐍 Python Deprecation:** This version completely replaces the old Python-based bot. The setup process, configuration, and deployment are entirely new. Please refer to the updated `README.md` for installation instructions.

#### 🛠️ Under the Hood

*   The project is now written entirely in **TypeScript**, providing type safety and improved developer experience.
*   The codebase is organized into a clean, modular structure (`/src`, `/handlers`, `/services`, `/db`, `/utils`, `/types`).
*   All secrets and API keys are now managed securely using `wrangler secret put`.
*   The project now uses a `.gitignore` file to prevent sensitive files from being committed to version control.

#### 🙏 Acknowledgements

This release would not have been possible without the power and flexibility of the Cloudflare Workers platform.