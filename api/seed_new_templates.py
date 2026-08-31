from database import get_connection
from psycopg2.extras import Json

conn = get_connection()
cur = conn.cursor()

employment_fields = [
    {"name": "employer_name", "label": "Employer/Business Name", "type": "text"},
    {"name": "employee_name", "label": "Employee Name", "type": "text"},
    {"name": "job_title", "label": "Job Title", "type": "text"},
    {"name": "start_date", "label": "Start Date", "type": "date"},
    {"name": "salary_amount", "label": "Monthly Salary (NGN)", "type": "number"},
    {"name": "work_schedule", "label": "Work Schedule (e.g. Mon-Fri, 9am-5pm)", "type": "text"},
    {"name": "probation_months", "label": "Probation Period (months)", "type": "number"},
]

employment_body = """EMPLOYMENT CONTRACT

This Employment Contract is entered into on {{start_date}} between {{employer_name}} ("Employer") and {{employee_name}} ("Employee").

1. POSITION
The Employee is engaged as {{job_title}}, commencing on {{start_date}}.

2. PROBATION
The Employee shall serve a probationary period of {{probation_months}} month(s), during which either party may terminate this contract with shorter notice.

3. REMUNERATION
The Employee shall receive a monthly salary of NGN {{salary_amount}}, payable in accordance with the Employer's standard payroll schedule, subject to applicable statutory deductions including PAYE tax.

4. WORK SCHEDULE
The Employee's standard work schedule is: {{work_schedule}}.

5. TERMINATION
Either party may terminate this contract by providing written notice in accordance with applicable Nigerian labour law.

6. CONFIDENTIALITY
The Employee agrees to keep confidential all proprietary business information encountered during employment, both during and after the term of this contract.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the Federal Republic of Nigeria, including the Labour Act.

Signed:

_________________________              _________________________
{{employer_name}}                        {{employee_name}}
Employer                                 Employee
"""

letter_fields = [
    {"name": "sender_name", "label": "Your Business Name", "type": "text"},
    {"name": "recipient_name", "label": "Recipient Name", "type": "text"},
    {"name": "subject", "label": "Subject", "type": "text"},
    {"name": "letter_date", "label": "Date", "type": "date"},
    {"name": "body_content", "label": "Letter Content", "type": "textarea"},
]

letter_body = """{{letter_date}}

To: {{recipient_name}}

RE: {{subject}}

{{body_content}}

Yours sincerely,

{{sender_name}}
"""

proposal_fields = [
    {"name": "your_business_name", "label": "Your Business Name", "type": "text"},
    {"name": "client_name", "label": "Prospective Client Name", "type": "text"},
    {"name": "proposal_date", "label": "Date", "type": "date"},
    {"name": "project_summary", "label": "Project Summary", "type": "textarea"},
    {"name": "scope_of_work", "label": "Scope of Work", "type": "textarea"},
    {"name": "estimated_cost", "label": "Estimated Cost (NGN)", "type": "number"},
    {"name": "timeline", "label": "Estimated Timeline (e.g. 4 weeks)", "type": "text"},
]

proposal_body = """BUSINESS PROPOSAL

Prepared by: {{your_business_name}}
Prepared for: {{client_name}}
Date: {{proposal_date}}

1. SUMMARY
{{project_summary}}

2. SCOPE OF WORK
{{scope_of_work}}

3. TIMELINE
Estimated completion: {{timeline}}

4. INVESTMENT
Estimated cost: NGN {{estimated_cost}}

This proposal is valid for 30 days from the date above. We look forward to the opportunity to work with you.

{{your_business_name}}
"""

templates = [
    ("Employment Contract", "employment-contract", employment_fields, employment_body),
    ("Business Letter", "business-letter", letter_fields, letter_body),
    ("Business Proposal", "business-proposal", proposal_fields, proposal_body),
]

for name, slug, fields, body in templates:
    cur.execute(
        "INSERT INTO contract_templates (name, slug, fields, body_template) VALUES (%s, %s, %s, %s) ON CONFLICT (slug) DO NOTHING",
        (name, slug, Json(fields), body),
    )

conn.commit()
cur.close()
conn.close()
print("New templates seeded successfully")
