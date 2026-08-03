-- CreateTable
CREATE TABLE "Literature" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "abstract" TEXT,
    "content" TEXT,
    "keywords" TEXT,
    "pdfPath" TEXT,
    "journalSource" TEXT,
    "journalUrl" TEXT,
    "aiAnalysis" TEXT,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateTime" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Note" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "createTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "literatureId" INTEGER NOT NULL,
    CONSTRAINT "Note_literatureId_fkey" FOREIGN KEY ("literatureId") REFERENCES "Literature" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#0891b2'
);

-- CreateTable
CREATE TABLE "_LiteratureToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LiteratureToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Literature" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LiteratureToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_LiteratureToTag_AB_unique" ON "_LiteratureToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_LiteratureToTag_B_index" ON "_LiteratureToTag"("B");
