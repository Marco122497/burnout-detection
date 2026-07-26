-- Optional sample parish projects for the public transparency page
INSERT INTO parish_projects (project_name, description, budget, status, start_date, end_date)
SELECT *
FROM (
  VALUES
    (
      'Church Roof Repair',
      'Structural repairs and waterproofing for the main nave roof.',
      250000.00,
      'Ongoing',
      CURRENT_DATE - INTERVAL '60 days',
      CURRENT_DATE + INTERVAL '120 days'
    ),
    (
      'Youth Ministry Hall',
      'Renovation of the parish hall for youth and catechesis programs.',
      180000.00,
      'Planning',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '365 days'
    )
) AS v(project_name, description, budget, status, start_date, end_date)
WHERE NOT EXISTS (SELECT 1 FROM parish_projects LIMIT 1);
