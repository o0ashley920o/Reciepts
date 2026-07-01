# SCHEMA

## Receipt

```json
{
  "id": "uuid",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "sourceName": "string",
  "mimeType": "image/jpeg|image/png|image/webp|image/heic|application/pdf",
  "imageHash": "sha256-hex",
  "thumbnailDataUrl": "data:image/jpeg;base64,...",
  "previewDataUrl": "data:image/jpeg;base64,...",
  "merchantName": "string",
  "abn": "XX XXX XXX XXX",
  "dateTime": "ISO-8601",
  "gst": "number",
  "total": "number",
  "paymentMethod": "EFTPOS|VISA|MASTERCARD|CASH|Unknown",
  "businessId": "uuid|null",
  "categoryId": "uuid|null",
  "financialYear": "YYYY-YY",
  "tags": ["string"],
  "notes": "string",
  "ocrText": "string",
  "ocrConfidence": "0-100",
  "extractionConfidence": "0-100",
  "ocrEdited": "boolean",
  "status": "new|reviewed|duplicate",
  "duplicateOf": "uuid|null"
}
```

## Business

```json
{
  "id": "uuid",
  "name": "string",
  "abn": "string",
  "address": "string",
  "defaultCategoryId": "uuid|null",
  "colour": "#RRGGBB",
  "createdAt": "ISO-8601"
}
```

## Category

```json
{
  "id": "uuid",
  "name": "string",
  "parentId": "uuid|null",
  "taxCode": "GST|FRE|BAS|N/A",
  "colour": "#RRGGBB",
  "createdAt": "ISO-8601"
}
```

## Settings

```json
{
  "currency": "AUD",
  "locale": "en-AU",
  "theme": "light|dark",
  "googleClientId": "string",
  "googleBackupFileName": "string",
  "googleDriveFolder": "string"
}
```

## Storage stores

- `receipts`: receipt metadata keyed by `id`
- `receipt-files`: `{ sourceBlob, previewBlob }` keyed by `receiptId`
- `lookups`: `{ businesses: Business[], categories: Category[] }`
- `settings`: `Settings`
