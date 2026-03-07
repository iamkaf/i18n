import { dbAll, dbFirst } from "@/lib/db";

type TotalSourceStringsRow = {
  total_source_strings: number;
};

type TotalTranslationsRow = {
  total_approved_translations: number;
};

type LocaleStatsRow = {
  locale: string;
  approved_count: number;
};

export async function GET() {
  const totalSourceRow = await dbFirst<TotalSourceStringsRow>(
    `SELECT COUNT(*) as total_source_strings
     FROM source_strings ss
     JOIN projects p ON p.id = ss.project_id
     WHERE p.visibility = 'public' AND ss.is_active = 1`,
  );

  const totalTranslationsRow = await dbFirst<TotalTranslationsRow>(
    `SELECT COUNT(*) as total_approved_translations
     FROM translations tr
     JOIN source_strings ss ON ss.id = tr.source_string_id
     JOIN projects p ON p.id = ss.project_id
     WHERE p.visibility = 'public' 
       AND ss.is_active = 1 
       AND tr.status = 'approved'`,
  );

  const totalSourceStrings = totalSourceRow?.total_source_strings ?? 0;
  const totalApprovedTranslations = totalTranslationsRow?.total_approved_translations ?? 0;

  const localeRows = await dbAll<LocaleStatsRow>(
    `SELECT 
       tr.locale,
       COUNT(*) as approved_count
     FROM translations tr
     JOIN source_strings ss ON ss.id = tr.source_string_id
     JOIN projects p ON p.id = ss.project_id
     WHERE p.visibility = 'public' 
       AND ss.is_active = 1 
       AND tr.status = 'approved'
     GROUP BY tr.locale
     ORDER BY approved_count DESC`,
  );

  const otherLocales = localeRows.map((row) => ({
    locale: row.locale,
    approved_count: row.approved_count,
    coverage: totalSourceStrings > 0 ? Number((row.approved_count / totalSourceStrings).toFixed(4)) : 0,
  }));

  const enUsLocale = {
    locale: "en_us",
    approved_count: totalSourceStrings,
    coverage: 1,
  };

  const locales = [enUsLocale, ...otherLocales];

  return Response.json({
    ok: true,
    stats: {
      total_source_strings: totalSourceStrings,
      total_approved_translations: totalApprovedTranslations,
      locales,
    },
  });
}
