const path = require('path');
const { logger, runAsSystem } = require('@librechat/data-schemas');
const { parseCodeEnvIdentifier } = require('librechat-data-provider');

require('module-alias')({ base: path.resolve(__dirname, '..', 'api') });
const connect = require('./connect');

const { File } = require('~/db/models');

/**
 * Backfills the structured `codeEnvRef` field on records that pre-date
 * the dual-write rollout — `SkillFile.codeEnvRef` and
 * `File.metadata.codeEnvRef`.
 *
 * Idempotent: a record that already has a usable `codeEnvRef` is
 * skipped. Records whose legacy string is unparseable are counted as
 * skipped (the read-side fallback handles them too, so no data loss).
 *
 * Not gated on the deploy — readers prefer `codeEnvRef` and fall back
 * to the legacy string when it's missing. Run on a maintenance window
 * to silence the fallback path for older fleets.
 *
 * @param {{ dryRun?: boolean, batchSize?: number }} [options]
 */
async function migrateCodeEnvRef({ dryRun = true, batchSize = 500 } = {}) {
  await connect();

  logger.info('Starting CodeEnvRef Backfill Migration', { dryRun, batchSize });

  return runAsSystem(async () => {
    const results = {
      dryRun,
      skillFiles: { scanned: 0, updated: 0, skipped: 0, unparseable: 0 },
      files: { scanned: 0, updated: 0, skipped: 0, unparseable: 0 },
      errors: 0,
    };

    const mongoose = require('mongoose');
    const SkillFile = mongoose.models.SkillFile;
    if (!SkillFile) {
      logger.warn('SkillFile model not registered; skipping skill file migration');
    } else {
      const skillCursor = SkillFile.find(
        {
          codeEnvIdentifier: { $exists: true, $ne: null },
          $or: [{ codeEnvRef: { $exists: false } }, { codeEnvRef: null }],
        },
        { _id: 1, codeEnvIdentifier: 1 },
      )
        .lean()
        .cursor({ batchSize });

      for await (const doc of skillCursor) {
        results.skillFiles.scanned++;
        try {
          const ref = parseCodeEnvIdentifier(doc.codeEnvIdentifier);
          if (!ref) {
            results.skillFiles.unparseable++;
            continue;
          }
          if (dryRun) {
            results.skillFiles.updated++;
            continue;
          }
          const update = await SkillFile.updateOne(
            { _id: doc._id, $or: [{ codeEnvRef: { $exists: false } }, { codeEnvRef: null }] },
            { $set: { codeEnvRef: ref } },
          );
          if (update.modifiedCount > 0) {
            results.skillFiles.updated++;
          } else {
            results.skillFiles.skipped++;
          }
        } catch (error) {
          results.errors++;
          logger.error(`SkillFile ${doc._id} backfill failed`, { error: error.message });
        }
      }
    }

    const fileCursor = File.find(
      {
        'metadata.fileIdentifier': { $exists: true, $ne: null },
        $or: [{ 'metadata.codeEnvRef': { $exists: false } }, { 'metadata.codeEnvRef': null }],
      },
      { _id: 1, 'metadata.fileIdentifier': 1 },
    )
      .lean()
      .cursor({ batchSize });

    for await (const doc of fileCursor) {
      results.files.scanned++;
      try {
        const ref = parseCodeEnvIdentifier(doc.metadata?.fileIdentifier);
        if (!ref) {
          results.files.unparseable++;
          continue;
        }
        if (dryRun) {
          results.files.updated++;
          continue;
        }
        const update = await File.updateOne(
          {
            _id: doc._id,
            $or: [{ 'metadata.codeEnvRef': { $exists: false } }, { 'metadata.codeEnvRef': null }],
          },
          { $set: { 'metadata.codeEnvRef': ref } },
        );
        if (update.modifiedCount > 0) {
          results.files.updated++;
        } else {
          results.files.skipped++;
        }
      } catch (error) {
        results.errors++;
        logger.error(`File ${doc._id} backfill failed`, { error: error.message });
      }
    }

    logger.info('CodeEnvRef Backfill Migration completed', results);
    return results;
  });
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const batchSize =
    parseInt(process.argv.find((arg) => arg.startsWith('--batch-size='))?.split('=')[1]) || 500;

  migrateCodeEnvRef({ dryRun, batchSize })
    .then((result) => {
      console.log(`\n=== ${dryRun ? 'DRY RUN ' : ''}RESULTS ===`);
      console.log(
        `SkillFile: scanned=${result.skillFiles.scanned} updated=${result.skillFiles.updated} skipped=${result.skillFiles.skipped} unparseable=${result.skillFiles.unparseable}`,
      );
      console.log(
        `File:      scanned=${result.files.scanned} updated=${result.files.updated} skipped=${result.files.skipped} unparseable=${result.files.unparseable}`,
      );
      if (result.errors > 0) {
        console.log(`Errors: ${result.errors}`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('CodeEnvRef backfill migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateCodeEnvRef };
