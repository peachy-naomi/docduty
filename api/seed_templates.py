from database import get_connection
from psycopg2.extras import Json

conn = get_connection()
cur = conn.cursor()

service_agreement_fields = [
    {"name": "client_name", "label": "Client Name", "type": "text"},
    {"name": "provider_name", "label": "Service Provider Name", "type": "text"},
    {"name": "service_description", "label": "Description of Services", "type": "textarea"},
    {"name": "fee_amount", "label": "Fee (NGN)", "type": "number"},
    {"name": "payment_terms", "label": "Payment Terms", "type": "text"},
    {"name": "start_date", "label": "Start Date", "type": "date"},
]

service_agreement_body = """SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into on {{start_date}} between {{provider_name}} ("Service Provider") and {{client_name}} ("Client").

1. SERVICES
The Service Provider agrees to provide the following services to the Client: {{service_description}}

2. FEES AND PAYMENT
The Client agrees to pay the Service Provider a fee of NGN {{fee_amount}}. Payment terms: {{payment_terms}}

3. TERM
This Agreement shall commence on {{start_date}} and shall continue until the services described above have been completed, unless terminated earlier by either party with written notice.

4. INDEPENDENT CONTRACTOR
The Service Provider is an independent contractor and not an employee of the Client. Nothing in this Agreement creates a partnership, joint venture, or employment relationship between the parties.

5. CONFIDENTIALITY
Each party agrees to keep confidential any proprietary or sensitive information disclosed by the other party during the course of this engagement.

6. GOVERNING LAW
This Agreement shall be governed by the laws of the Federal Republic of Nigeria.

Signed:

_________________________              _________________________
{{provider_name}}                        {{client_name}}
Service Provider                         Client
"""

nda_fields = [
    {"name": "party_a_name", "label": "First Party Name", "type": "text"},
    {"name": "party_b_name", "label": "Second Party Name", "type": "text"},
    {"name": "purpose", "label": "Purpose of Disclosure", "type": "textarea"},
    {"name": "effective_date", "label": "Effective Date", "type": "date"},
    {"name": "duration_years", "label": "Duration (years)", "type": "number"},
]

nda_body = """MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into on {{effective_date}} between {{party_a_name}} and {{party_b_name}} (together, the "Parties").

1. PURPOSE
The Parties wish to explore a potential business relationship in connection with: {{purpose}}. In connection with this purpose, each Party may disclose confidential information to the other.

2. CONFIDENTIAL INFORMATION
"Confidential Information" means any non-public information disclosed by either Party, whether written, oral, or in any other form, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information.

3. OBLIGATIONS
Each Party agrees to: (a) hold the other Party's Confidential Information in strict confidence; (b) not disclose such information to any third party without prior written consent; and (c) use the Confidential Information solely for the purpose stated above.

4. TERM
This Agreement shall remain in effect for {{duration_years}} year(s) from the Effective Date.

5. GOVERNING LAW
This Agreement shall be governed by the laws of the Federal Republic of Nigeria.

Signed:

_________________________              _________________________
{{party_a_name}}                         {{party_b_name}}
"""

cur.execute(
    "INSERT INTO contract_templates (name, slug, fields, body_template) VALUES (%s, %s, %s, %s) ON CONFLICT (slug) DO NOTHING",
    ("Service Agreement", "service-agreement", Json(service_agreement_fields), service_agreement_body),
)
cur.execute(
    "INSERT INTO contract_templates (name, slug, fields, body_template) VALUES (%s, %s, %s, %s) ON CONFLICT (slug) DO NOTHING",
    ("Mutual NDA", "mutual-nda", Json(nda_fields), nda_body),
)

conn.commit()
cur.close()
conn.close()
print("Templates seeded successfully")
