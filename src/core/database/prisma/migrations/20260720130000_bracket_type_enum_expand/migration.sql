-- BracketType was created with only SE/DE; schema later added more values without a migration.
ALTER TYPE "BracketType" ADD VALUE IF NOT EXISTS 'ROUND_ROBIN';
ALTER TYPE "BracketType" ADD VALUE IF NOT EXISTS 'SWISS';
ALTER TYPE "BracketType" ADD VALUE IF NOT EXISTS 'GSL';
ALTER TYPE "BracketType" ADD VALUE IF NOT EXISTS 'GROUP_PLAYOFFS';
ALTER TYPE "BracketType" ADD VALUE IF NOT EXISTS 'LEAGUE';
ALTER TYPE "BracketType" ADD VALUE IF NOT EXISTS 'HYBRID';
