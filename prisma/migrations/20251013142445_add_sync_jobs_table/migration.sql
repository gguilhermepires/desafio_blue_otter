-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" SERIAL NOT NULL,
    "job_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'QUEUED',
    "repositories_count" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_jobs_job_id_key" ON "sync_jobs"("job_id");

-- CreateIndex
CREATE INDEX "sync_jobs_job_id_idx" ON "sync_jobs"("job_id");

-- CreateIndex
CREATE INDEX "sync_jobs_username_idx" ON "sync_jobs"("username");

-- CreateIndex
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs"("status");

-- CreateIndex
CREATE INDEX "sync_jobs_created_at_idx" ON "sync_jobs"("created_at");
