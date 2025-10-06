# ClickUp Rate Limit Handling

## Overview
This document describes the rate limit handling implementation for the ClickUp API integration.

## ClickUp Rate Limits
According to [ClickUp's documentation](https://developer.clickup.com/docs/rate-limits):
- **Free Forever, Unlimited, Business**: 100 requests per minute per token
- **Business Plus**: 1,000 requests per minute per token  
- **Enterprise**: 10,000 requests per minute per token

## Rate Limit Headers
When a rate limit is exceeded (HTTP 429), ClickUp returns these headers:
- `X-RateLimit-Limit`: Current rate limit for the token
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Time when the rate limit will reset (Unix timestamp)

## Implementation

### Automatic Retry with Exponential Backoff
The `ClickUpClient` class now includes a `retryWithBackoff` method that:

1. **Detects rate limit errors** by checking:
   - HTTP status code 429
   - Error response with `err: "Rate limit reached"`
   - Error code `ECODE: "APP_002"`

2. **Reads rate limit headers** to determine exact wait time:
   - Uses `X-RateLimit-Reset` header to calculate precise wait time
   - Adds 1-second buffer to ensure rate limit window has passed

3. **Smart waiting strategy**:
   - If wait time > 1 minute: **Exits immediately** with helpful error message showing:
     - Exact time when rate limit will reset
     - Number of minutes to wait
   - If wait time ≤ 1 minute: **Waits automatically** and retries
   - Falls back to exponential backoff (2s, 4s, 8s, 16s, 32s) if headers not available

4. **Applies to critical operations**:
   - `createTask()` - Creating new tasks
   - `updateTask()` - Updating existing tasks
   - `uploadAttachment()` - Uploading files
   - `addTaskComment()` - Adding comments
   - `setCustomField()` - Setting custom field values

### Example Error Messages

**When wait time > 1 minute:**
```
Error: Rate limit exceeded. Please wait until 2:30:45 PM on 10/6/2025 (5 minutes) before retrying.
```

**When wait time ≤ 1 minute:**
```
⚠️  Rate limit reached. Waiting 45s until reset at 2:25:30 PM...
```

## Usage
No changes required to existing code - rate limit handling is automatic for all ClickUp API operations.

## Configuration
The retry behavior uses these defaults (can be customized in the `retryWithBackoff` method):
- `maxRetries`: 5 attempts
- `initialDelayMs`: 2000ms (2 seconds)
- Exponential backoff multiplier: 2x

## Testing
To test the rate limit handling:
1. Run bulk migrations with many issues
2. The system will automatically handle rate limits
3. Check console for rate limit warnings
4. If rate limit requires > 1 minute wait, operation will fail with informative message
