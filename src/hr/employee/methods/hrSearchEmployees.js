import { PrismaClient } from "@prisma/client";
import { verifyHrJWT } from "../../hr-session-management/methods/hrSessionManagementMethods.js";

const prisma = new PrismaClient();

/**
 * Admin fuzzy+weighted employee search (no indexes required).
 * Returns: [{ employeeId, propertyMatched, matchFound, tableSearched }]
 *
 * @param authHeader "Bearer <token>"
 * @param opts { searchText: string; limit?: number; fuzzyLimit?: number }
 */
export async function hrSearchEmployees(
  authHeader,
  { searchText, limit = 50, fuzzyLimit = 0.25 } // fuzzyLimit: lower = looser matches
) {
  try {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Authorization header missing or invalid");
    }

    // Verify admin
    const { hrId } = await verifyHrJWT(authHeader);
    const hr = await prisma.hr.findUnique({ where: { id: hrId } });
    if (!hr) throw new Error("HR not found");

    // Optional: tune trigram similarity threshold for this session
    // Requires pg_trgm extension (you said it's enabled)
    await prisma.$executeRaw`SELECT set_limit(${fuzzyLimit});`;

    // The unified, weighted, fuzzy search (Employee > EmployeeDetails)
    const rows = await prisma.$queryRaw`
WITH q AS (
  SELECT
    lower(unaccent(${searchText}::text)) AS raw,
    regexp_replace(lower(unaccent(${searchText}::text)), '\s+', '', 'g') AS nospace,
    websearch_to_tsquery('simple', lower(unaccent(${searchText}::text))) AS tsq
)
SELECT
  e."employeeId" AS "employeeId",
  CASE WHEN ewin.score >= dwin.score * 0.7 THEN ewin.colname ELSE dwin.colname END  AS "propertyMatched",
  CASE WHEN ewin.score >= dwin.score * 0.7 THEN ewin.val     ELSE dwin.val     END  AS "matchFound",
  CASE WHEN ewin.score >= dwin.score * 0.7 THEN 'Employee'   ELSE 'EmployeeDetails' END AS "tableSearched"
FROM "Employee" e
LEFT JOIN "EmployeeDetails" d
  ON d."employeeId" = e."employeeId",
q
-- pick the best single column hit inside Employee (A-tier: employeeId, name, assignedEmail)
CROSS JOIN LATERAL (
  SELECT colname, score, val
  FROM (VALUES
    ('employeeId',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(e."employeeId",'')))) THEN 1.0 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(e."employeeId",''))), q.raw) * 0.6
      + (CASE WHEN lower(unaccent(coalesce(e."employeeId",''))) = q.raw
               OR regexp_replace(lower(unaccent(coalesce(e."employeeId",''))), '\s+','','g') = q.nospace
              THEN 2.0 ELSE 0 END),
      e."employeeId"
    ),
    ('name',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(e."name",'')))) THEN 1.0 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(e."name",''))), q.raw) * 0.6
      + (CASE WHEN lower(unaccent(coalesce(e."name",''))) = q.raw THEN 2.0 ELSE 0 END),
      e."name"
    ),
    ('assignedEmail',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(e."assignedEmail",'')))) THEN 1.0 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(e."assignedEmail",''))), q.raw) * 0.6
      + (CASE WHEN lower(unaccent(coalesce(e."assignedEmail",''))) = q.raw THEN 2.0 ELSE 0 END),
      e."assignedEmail"
    )
  ) AS t(colname, score, val)
  ORDER BY score DESC
  LIMIT 1
) AS ewin

-- pick the best single column hit inside EmployeeDetails (A>B>C>D per your order)
CROSS JOIN LATERAL (
  SELECT colname, score, val
  FROM (VALUES
    -- A
    ('employeeId',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."employeeId",'')))) THEN 1.0 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."employeeId",''))), q.raw) * 0.6
      + (CASE WHEN lower(unaccent(coalesce(d."employeeId",''))) = q.raw
               OR regexp_replace(lower(unaccent(coalesce(d."employeeId",''))), '\s+','','g') = q.nospace
              THEN 2.0 ELSE 0 END),
      d."employeeId"
    ),
    ('assignedShiftId',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."assignedShiftId",'')))) THEN 0.9 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."assignedShiftId",''))), q.raw) * 0.5,
      d."assignedShiftId"
    ),
    ('personalEmail',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."personalEmail",'')))) THEN 0.9 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."personalEmail",''))), q.raw) * 0.5
      + (CASE WHEN lower(unaccent(coalesce(d."personalEmail",''))) = q.raw THEN 1.5 ELSE 0 END),
      d."personalEmail"
    ),
    -- B
    ('designation',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."designation",'')))) THEN 0.7 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."designation",''))), q.raw) * 0.45,
      d."designation"
    ),
    ('department',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."department",'')))) THEN 0.7 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."department",''))), q.raw) * 0.45,
      d."department"
    ),
    ('aadhaarCardNumber',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."aadhaarCardNumber",'')))) THEN 0.7 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."aadhaarCardNumber",''))), q.raw) * 0.45
      + (CASE WHEN regexp_replace(lower(unaccent(coalesce(d."aadhaarCardNumber",''))), '\s+','','g') = q.nospace THEN 1.2 ELSE 0 END),
      d."aadhaarCardNumber"
    ),
    ('panCardNumber',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."panCardNumber",'')))) THEN 0.7 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."panCardNumber",''))), q.raw) * 0.45,
      d."panCardNumber"
    ),
    -- C
    ('phoneNumber',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."phoneNumber",'')))) THEN 0.45 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."phoneNumber",''))), q.raw) * 0.35
      + (CASE WHEN regexp_replace(lower(unaccent(coalesce(d."phoneNumber",''))), '\s+','','g') = q.nospace THEN 0.8 ELSE 0 END),
      d."phoneNumber"
    ),
    ('presentAddress',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."presentAddress",'')))) THEN 0.45 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."presentAddress",''))), q.raw) * 0.35,
      d."presentAddress"
    ),
    ('permanentAddress',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."permanentAddress",'')))) THEN 0.45 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."permanentAddress",''))), q.raw) * 0.35,
      d."permanentAddress"
    ),
    -- D
    ('highestEducationalQualification',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."highestEducationalQualification",'')))) THEN 0.25 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."highestEducationalQualification",''))), q.raw) * 0.25,
      d."highestEducationalQualification"
    ),
    ('bankAccountNumber',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."bankAccountNumber",'')))) THEN 0.25 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."bankAccountNumber",''))), q.raw) * 0.25
      + (CASE WHEN regexp_replace(lower(unaccent(coalesce(d."bankAccountNumber",''))), '\s+','','g') = q.nospace THEN 0.6 ELSE 0 END),
      d."bankAccountNumber"
    ),
    ('ifsCode',
      (CASE WHEN q.tsq @@ to_tsvector('simple', lower(unaccent(coalesce(d."ifsCode",'')))) THEN 0.25 ELSE 0 END)
      + similarity(lower(unaccent(coalesce(d."ifsCode",''))), q.raw) * 0.25,
      d."ifsCode"
    )
  ) AS t(colname, score, val)
  ORDER BY score DESC
  LIMIT 1
) AS dwin
WHERE
  -- only keep rows that actually match in a reasonable way
  ewin.score >= 0.5
  OR dwin.score >= 0.5
  OR lower(unaccent(coalesce(e."employeeId",'') || ' ' || coalesce(e."name",'') || ' ' || coalesce(e."assignedEmail",''))) % q.raw
  OR lower(unaccent(
       coalesce(d."employeeId",'') || ' ' || coalesce(d."assignedShiftId",'') || ' ' || coalesce(d."personalEmail",'') || ' ' ||
       coalesce(d."designation",'') || ' ' || coalesce(d."department",'') || ' ' || coalesce(d."aadhaarCardNumber",'') || ' ' ||
       coalesce(d."panCardNumber",'') || ' ' || coalesce(d."phoneNumber",'') || ' ' || coalesce(d."presentAddress",'') || ' ' ||
       coalesce(d."permanentAddress",'') || ' ' || coalesce(d."highestEducationalQualification",'') || ' ' ||
       coalesce(d."bankAccountNumber",'') || ' ' || coalesce(d."ifsCode",'')
     )) % q.raw
ORDER BY
  GREATEST(ewin.score, dwin.score * 0.7) DESC
LIMIT ${limit};
    `;

    return rows; // already in desired shape
  } catch (err) {
    console.error("🔥 Error in adminSearchEmployees:", err);
    throw err;
  }
}
