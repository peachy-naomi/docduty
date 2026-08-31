from database import get_connection
from psycopg2.extras import Json

conn = get_connection()
cur = conn.cursor()

fields = [
    {"name": "business_name", "label": "Business Name", "type": "text"},
    {"name": "website_url", "label": "Website URL", "type": "text"},
    {"name": "contact_email", "label": "Contact Email", "type": "text"},
    {"name": "collects_personal_data", "label": "Do you collect personal data (name, email, phone)?", "type": "checkbox"},
    {"name": "collects_payment_info", "label": "Do you collect payment information?", "type": "checkbox"},
    {"name": "uses_cookies", "label": "Does your website use cookies?", "type": "checkbox"},
    {"name": "shares_with_third_parties", "label": "Do you share data with third parties?", "type": "checkbox"},
    {"name": "has_mailing_list", "label": "Do you operate an email mailing list?", "type": "checkbox"},
]

body = """PRIVACY POLICY

{{business_name}} ("we", "us", or "our") operates the website {{website_url}}. This Privacy Policy explains how we collect, use, and protect information when you use our website and services.

1. INFORMATION WE COLLECT

{{#if collects_personal_data}}
We may collect personal information such as your name, email address, and phone number when you interact with our website or services.
{{/if}}

{{#if collects_payment_info}}
We may collect payment information necessary to process transactions. Payment processing is handled by trusted third-party payment providers, and we do not store your full card details on our own systems.
{{/if}}

{{#if uses_cookies}}
2. COOKIES

Our website uses cookies to improve your browsing experience, understand how visitors use our site, and remember your preferences. You can control or disable cookies through your browser settings.
{{/if}}

3. HOW WE USE YOUR INFORMATION

We use the information we collect to provide and improve our services, communicate with you, process transactions, and comply with legal obligations.

{{#if shares_with_third_parties}}
4. SHARING YOUR INFORMATION

We may share your information with trusted third-party service providers who assist us in operating our business, subject to appropriate confidentiality obligations. We do not sell your personal information to third parties.
{{/if}}

{{#if has_mailing_list}}
5. EMAIL COMMUNICATIONS

If you subscribe to our mailing list, we will use your email address to send you updates and communications. You may unsubscribe at any time using the link provided in our emails.
{{/if}}

6. DATA SECURITY

We take reasonable measures to protect your information from unauthorized access, alteration, disclosure, or destruction.

7. YOUR RIGHTS

You have the right to request access to, correction of, or deletion of your personal information. To exercise these rights, please contact us at {{contact_email}}.

8. CHANGES TO THIS POLICY

We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date.

9. CONTACT US

If you have any questions about this Privacy Policy, please contact us at {{contact_email}}.
"""

cur.execute(
    "INSERT INTO contract_templates (name, slug, fields, body_template) VALUES (%s, %s, %s, %s) ON CONFLICT (slug) DO NOTHING",
    ("Privacy Policy", "privacy-policy", Json(fields), body),
)

conn.commit()
cur.close()
conn.close()
print("Privacy policy template seeded successfully")
