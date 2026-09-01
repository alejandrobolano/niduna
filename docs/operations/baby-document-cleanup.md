# Baby document cleanup

Baby documents use the private `baby-documents` Storage bucket. Uploads are first reserved as drafts and only become visible after the database verifies the stored MIME type and size.

The `cleanup-baby-documents` Edge Function runs every 15 minutes. It removes replaced files, failed uploads older than one hour, and objects queued when document metadata is deleted. Failed objects remain queued and can be retried safely because claiming and removal are idempotent.

Monitor `baby_document_storage_cleanup` for rows whose `status` is `failed` or whose `attempts` keeps increasing. Never expose the service role key to the client.
