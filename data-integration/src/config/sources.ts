const SOCRATA_DOMAIN = "https://www.datos.gov.co";

export const SOURCES = {
  institutions: {
    id: "n5yy-8nav",
    name: "MEN_INSTITUCIONES EDUCACIÓN SUPERIOR",
    pageUrl: `${SOCRATA_DOMAIN}/d/n5yy-8nav`,
    resourceUrl: `${SOCRATA_DOMAIN}/resource/n5yy-8nav.json`,
  },
  programs: {
    id: "upr9-nkiz",
    name: "MEN_PROGRAMAS_DE_EDUCACIÓN_SUPERIOR",
    pageUrl: `${SOCRATA_DOMAIN}/d/upr9-nkiz`,
    resourceUrl: `${SOCRATA_DOMAIN}/resource/upr9-nkiz.json`,
  },
} as const;
