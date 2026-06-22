-- RenameTable
ALTER TABLE "User" RENAME TO "system_user";

-- RenameIndex
ALTER INDEX "User_userName_key" RENAME TO "system_user_userName_key";
