# Receipt OCR Feature Specification

**Status:** Documentation Only (Not Yet Implemented)
**Target Version:** v2+

This document provides comprehensive specifications for the Receipt OCR feature, allowing users to upload receipt images/PDFs and automatically extract transaction data.

---

## Overview

The Receipt OCR feature enables users to:
1. Upload receipt images or PDFs
2. Automatically extract transaction data (amount, date, merchant, items)
3. Create or link transactions with one click
4. Store receipts for record-keeping

---

## Database Schema

### New Table: `receipts`

```sql
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,

  -- File metadata
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL, -- 'image/jpeg', 'image/png', 'application/pdf'
  storage_path TEXT NOT NULL, -- Supabase Storage path
  thumbnail_path TEXT, -- Smaller preview image path

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'processing', 'completed', 'failed'

  -- Extracted data
  ocr_text TEXT, -- Raw extracted text from OCR
  extracted_data JSONB, -- Structured: {amount, date, merchant, items[], currency}
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  error_message TEXT, -- Error details if processing failed

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- Indexes
CREATE INDEX idx_receipts_user ON public.receipts(user_id);
CREATE INDEX idx_receipts_transaction ON public.receipts(transaction_id);
CREATE INDEX idx_receipts_status ON public.receipts(status);
CREATE INDEX idx_receipts_created ON public.receipts(created_at DESC);

-- RLS Policies
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own receipts"
  ON public.receipts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own receipts"
  ON public.receipts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own receipts"
  ON public.receipts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own receipts"
  ON public.receipts FOR DELETE
  USING (user_id = auth.uid());
```

### Extracted Data JSON Structure

```typescript
interface ExtractedReceiptData {
  amount: number | null;          // Total amount detected
  date: string | null;            // Date in YYYY-MM-DD format
  merchant: string | null;        // Store/vendor name
  currency: string;               // Detected currency (default: 'CAD')
  items: ReceiptItem[];           // Line items if detected
  tax_amount: number | null;      // Tax if separately detected
  subtotal: number | null;        // Subtotal if detected
  payment_method: string | null;  // Card type if detected
  raw_amounts: number[];          // All amounts found (for disambiguation)
}

interface ReceiptItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}
```

---

## Storage Requirements

### Supabase Storage Bucket

**Bucket Name:** `receipts`

**Configuration:**
- Public: No (private bucket)
- Max file size: 10 MB
- Allowed MIME types:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `application/pdf`

### File Path Structure

```
receipts/
  {user_id}/
    {year}/
      {month}/
        {receipt_id}.{ext}
        {receipt_id}_thumb.jpg  (generated thumbnail)
```

**Example:**
```
receipts/123e4567-e89b-12d3-a456-426614174000/2025/01/abc-def-123.jpg
receipts/123e4567-e89b-12d3-a456-426614174000/2025/01/abc-def-123_thumb.jpg
```

### Storage Policies

```sql
-- Supabase Storage RLS
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## API Endpoints

### POST /api/receipts/upload

Upload a new receipt for processing.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (required) - The receipt image or PDF

**Response:**
```json
{
  "id": "uuid",
  "status": "pending",
  "file_name": "receipt.jpg",
  "storage_path": "receipts/{user_id}/2025/01/{id}.jpg",
  "created_at": "2025-01-15T10:30:00Z"
}
```

**Errors:**
- 400: Invalid file type or size
- 401: Unauthorized
- 413: File too large

### GET /api/receipts

List all receipts for the current user.

**Query Parameters:**
- `status` (optional): Filter by status (pending, processing, completed, failed)
- `linked` (optional): `true` for linked only, `false` for unlinked only
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "receipts": [
    {
      "id": "uuid",
      "file_name": "receipt.jpg",
      "thumbnail_url": "signed-url",
      "status": "completed",
      "transaction_id": "uuid or null",
      "extracted_data": { ... },
      "confidence_score": 0.95,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 42
}
```

### GET /api/receipts/[id]

Get a single receipt with full details.

**Response:**
```json
{
  "id": "uuid",
  "file_name": "receipt.jpg",
  "file_url": "signed-url",
  "thumbnail_url": "signed-url",
  "status": "completed",
  "ocr_text": "Raw extracted text...",
  "extracted_data": {
    "amount": 45.99,
    "date": "2025-01-15",
    "merchant": "Walmart",
    "items": [ ... ]
  },
  "confidence_score": 0.95,
  "transaction_id": null,
  "created_at": "2025-01-15T10:30:00Z",
  "processed_at": "2025-01-15T10:30:05Z"
}
```

### POST /api/receipts/[id]/process

Retry OCR processing for a failed receipt.

**Response:**
```json
{
  "id": "uuid",
  "status": "processing"
}
```

### POST /api/receipts/[id]/link

Link a receipt to an existing transaction.

**Request:**
```json
{
  "transaction_id": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "transaction_id": "uuid",
  "message": "Receipt linked to transaction"
}
```

### POST /api/receipts/[id]/create-transaction

Create a new transaction from extracted receipt data.

**Request:**
```json
{
  "account_id": "uuid",
  "category_id": "uuid",
  "override_amount": 45.99,    // Optional: override extracted amount
  "override_date": "2025-01-15" // Optional: override extracted date
}
```

**Response:**
```json
{
  "receipt_id": "uuid",
  "transaction_id": "uuid",
  "transaction": { ... }
}
```

### DELETE /api/receipts/[id]

Delete a receipt and its storage file.

**Response:**
```json
{
  "success": true,
  "message": "Receipt deleted"
}
```

---

## Processing Flow

```
1. USER UPLOADS RECEIPT
   ↓
   POST /api/receipts/upload
   ↓
   Validate file type and size
   ↓
   Generate unique ID and storage path
   ↓
   Upload to Supabase Storage
   ↓
   Create receipts record (status: pending)
   ↓
   Return immediately with receipt ID

2. ASYNC PROCESSING (Background Job / Edge Function)
   ↓
   Update status to 'processing'
   ↓
   Download image from storage
   ↓
   OPTION A: Basic OCR (Tesseract.js or similar)
   - Extract raw text
   - Parse with regex for amounts, dates, merchant
   ↓
   OPTION B: AI Vision (GPT-4 Vision / Claude Vision)
   - Send image to AI model
   - Request structured extraction
   - Higher accuracy but higher cost
   ↓
   OPTION C: Dedicated OCR Service
   - Google Cloud Vision API
   - AWS Textract
   - Azure Document Intelligence
   ↓
   Parse results into ExtractedReceiptData
   ↓
   Calculate confidence score
   ↓
   Generate thumbnail for preview
   ↓
   Update record with extracted_data
   ↓
   Set status to 'completed' or 'failed'

3. USER REVIEWS EXTRACTION
   ↓
   Show extracted data with editable fields
   ↓
   User confirms or corrects values
   ↓
   User selects account and category
   ↓
   POST /api/receipts/[id]/create-transaction
   ↓
   Transaction created and linked to receipt
```

---

## UI Components

### 1. ReceiptUploadButton

**Location:** Transaction form, Transactions page header

**Features:**
- Drag-and-drop zone
- Click to select file
- Camera capture on mobile
- Upload progress indicator
- File type validation
- Size limit warning

### 2. ReceiptPreview

**Location:** Receipt list, Transaction detail

**Features:**
- Thumbnail image
- Status indicator (pending, processing, completed, failed)
- Quick actions (view, link, delete)
- Extracted amount overlay

### 3. ReceiptDetailModal

**Location:** Modal overlay

**Features:**
- Full-size image viewer with zoom
- Extracted data form (editable)
- Confidence score indicator
- OCR text view (expandable)
- "Create Transaction" button
- "Link to Existing" dropdown
- Retry processing button (if failed)

### 4. ReceiptGallery

**Location:** New page `/dashboard/receipts`

**Features:**
- Grid view of all receipts
- Filter by status
- Filter by linked/unlinked
- Sort by date
- Bulk actions (delete)
- Pagination

### 5. TransactionReceiptBadge

**Location:** Transaction list, Transaction detail

**Features:**
- Receipt icon indicator
- Click to view linked receipt
- Tooltip with receipt info

---

## Transaction Linking Strategy

### Recommended: One-to-One Relationship

Each receipt links to at most one transaction.

**Implementation:**
- `receipts.transaction_id` → `transactions.id`
- Transaction can optionally reference receipt via join
- Simple, clear relationship
- Easy to query and display

**Alternative Query (from transaction side):**
```sql
SELECT t.*, r.id as receipt_id, r.thumbnail_path
FROM transactions t
LEFT JOIN receipts r ON r.transaction_id = t.id
WHERE t.user_id = $1;
```

### Alternative: Many-to-Many (Not Recommended for MVP)

One receipt could have multiple transactions (e.g., split receipts).

**Would require:**
- Junction table `receipt_transactions`
- More complex UI for splitting
- More complex linking logic

---

## Edge Cases

### 1. Blurry or Unreadable Image
- Set status to 'failed'
- Provide clear error message: "Image quality too low. Please upload a clearer photo."
- Allow manual entry with image as reference
- Offer retry with different settings

### 2. No Amount Found
- Mark extraction as partial (confidence < 0.5)
- Show warning: "Could not detect amount"
- Allow user to enter amount manually
- Still link to transaction for reference

### 3. Multiple Total Amounts
- Store all found amounts in `raw_amounts`
- Show options to user: "Multiple amounts detected. Which is the total?"
- Let user pick or enter manually
- Common case: subtotal, tax, total

### 4. Foreign Currency Detected
- Warn user: "Foreign currency detected (USD). This app uses CAD only."
- Store original currency in extracted_data
- Do not auto-convert
- Let user enter CAD amount manually

### 5. Duplicate Receipt
- Check for existing receipts with similar date + amount
- Warn: "Similar receipt already exists"
- Show comparison
- Allow user to proceed or cancel

### 6. PDF with Multiple Pages
- Process each page separately
- Combine results intelligently
- Show page-by-page preview
- Common for itemized receipts

### 7. Very Large Image
- Resize before upload if over threshold
- Maintain aspect ratio
- Generate smaller processing version
- Keep original for record

### 8. Processing Timeout
- Set reasonable timeout (30s per image)
- Mark as failed if exceeded
- Allow manual retry
- Consider queue-based processing

---

## Cost Considerations

### OCR API Costs (Estimates)

| Provider | Cost per Image | Notes |
|----------|----------------|-------|
| Tesseract.js | Free | Local processing, lower accuracy |
| Google Cloud Vision | ~$1.50/1000 | Good accuracy, requires API key |
| AWS Textract | ~$1.50/1000 | Good for structured documents |
| GPT-4 Vision | ~$0.01/image | Highest accuracy, expensive at scale |
| Claude Vision | ~$0.01/image | Similar to GPT-4 Vision |

### Storage Costs

| Provider | Cost | Notes |
|----------|------|-------|
| Supabase Storage | 1GB free, then $0.021/GB | Included in plan |

### Recommendations

1. **MVP:** Use Tesseract.js (free) with fallback to AI Vision for failures
2. **Scale:** Move to Google Cloud Vision for better accuracy/cost ratio
3. **Premium:** Offer AI Vision as optional upgrade for users

### Rate Limiting

- Limit uploads per user: 20/day free, more for premium
- Queue processing to prevent overload
- Thumbnail generation async

---

## Security Considerations

1. **File Validation**
   - Validate MIME type on upload
   - Check magic bytes, not just extension
   - Scan for malware if possible

2. **Storage Access**
   - Signed URLs with expiration
   - Never expose raw storage paths
   - RLS on storage bucket

3. **Data Privacy**
   - OCR text may contain sensitive info
   - Delete promptly when receipt deleted
   - Consider retention policies

4. **API Rate Limiting**
   - Prevent abuse of upload endpoint
   - Limit concurrent processing per user

---

## Future Enhancements

1. **Automatic Category Detection**
   - Use merchant name to suggest category
   - Learn from user corrections

2. **Recurring Receipt Detection**
   - Identify similar receipts over time
   - Suggest as recurring transaction

3. **Receipt Search**
   - Full-text search on OCR text
   - Filter by merchant, date range

4. **Batch Upload**
   - Upload multiple receipts at once
   - Process in queue

5. **Email Receipt Import**
   - Parse receipts from email forwarding
   - Integration with email providers
