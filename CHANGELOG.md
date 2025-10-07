### [2.0.1] - "The Efficiency Patch" - 2025-10-07

This patch release implements a major architectural overhaul to dramatically improve the performance, reliability, and cost-effectiveness of the daily broadcast.

#### ✨ New Features

*   **🧠 Memory-Based Broadcasting**: The daily broadcast now fetches data from APIs and AI services only **once** per broadcast, regardless of the number of users. The prepared content is temporarily stored in memory and sent to all users, making the system incredibly efficient.

#### ⚙️ Changes & Improvements

*   **🚀 Performance Boost**: Resolved a critical performance bottleneck where API calls were made for every user. The new architecture is orders of magnitude faster and scales perfectly as the user base grows.
*   **💰 Cost Reduction**: By eliminating redundant API calls, this patch significantly reduces the cost associated with AI and translation services.
*   **🔧 Admin Command Refactor**: All admin commands (`/testbroadcast`, `/skipobject`, etc.) have been updated to use the new, efficient broadcast pattern.
*   **🛠️ New Admin Command**: Added a `/skipobject` command to allow administrators to skip an object in the queue without sending it to users.
*   **⚡ Performance Fix**: Resolved "stalled HTTP response" warnings by ensuring all HTTP response bodies are properly consumed, preventing connection deadlocks.

#### 💥 Breaking Changes

*   The internal logic for broadcasting has changed. While the end-user experience is the same, developers should be aware of the new `utils/memory.ts` module.

#### 🛠️ Under the Hood

*   Introduced a `src/utils/memory.ts` module to handle the stateful preparation and cleanup of broadcast content.
*   The `processAndSendToUser` function has been simplified to consume pre-prepared content from memory.
*   The `handleScheduled` function now orchestrates a clear `prepare -> loop -> clear` workflow.