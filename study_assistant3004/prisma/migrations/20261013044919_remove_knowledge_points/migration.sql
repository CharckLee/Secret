/*
  Warnings:

  - You are about to drop the `KnowledgePoint` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_KnowledgePointToPathNode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `knowledgePointId` on the `CheckIn` table. All the data in the column will be lost.
  - You are about to drop the column `knowledgePointId` on the `Review` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "_KnowledgePointToPathNode_B_index";

-- DropIndex
DROP INDEX "_KnowledgePointToPathNode_AB_unique";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "KnowledgePoint";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_KnowledgePointToPathNode";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PARTIAL',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subjectId" TEXT NOT NULL,
    "pathNodeId" TEXT,
    CONSTRAINT "CheckIn_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CheckIn_pathNodeId_fkey" FOREIGN KEY ("pathNodeId") REFERENCES "PathNode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CheckIn" ("createdAt", "date", "durationMinutes", "id", "note", "pathNodeId", "status", "subjectId") SELECT "createdAt", "date", "durationMinutes", "id", "note", "pathNodeId", "status", "subjectId" FROM "CheckIn";
DROP TABLE "CheckIn";
ALTER TABLE "new_CheckIn" RENAME TO "CheckIn";
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gain" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL DEFAULT '',
    "plan" TEXT NOT NULL DEFAULT '',
    "difficulty" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "subjectId" TEXT,
    "pathNodeId" TEXT,
    CONSTRAINT "Review_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Review_pathNodeId_fkey" FOREIGN KEY ("pathNodeId") REFERENCES "PathNode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Review" ("createdAt", "date", "difficulty", "gain", "id", "pathNodeId", "plan", "question", "subjectId", "updatedAt") SELECT "createdAt", "date", "difficulty", "gain", "id", "pathNodeId", "plan", "question", "subjectId", "updatedAt" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
