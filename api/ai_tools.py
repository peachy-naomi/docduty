"""
Defines the 'tools' Claude is allowed to call during a chat conversation.
Each tool description maps directly onto an existing, real backend function —
the AI layer never bypasses our actual validation, VAT calculation, or
multi-tenant ownership checks. It just decides *when* to call them and
gathers the right inputs through conversation.
"""

TOOLS = [
    {
        "name": "create_invoice",
        "description": "Creates an invoice or quotation for a client and calculates VAT automatically. Always confirm the details with the user before calling this.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "integer", "description": "The ID of the client this document is for"},
                "document_type": {"type": "string", "enum": ["invoice", "quotation"]},
                "bill_to_name": {"type": "string"},
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {"type": "string"},
                            "quantity": {"type": "number"},
                            "unit_price_naira": {"type": "number"},
                        },
                        "required": ["description", "quantity", "unit_price_naira"],
                    },
                },
                "due_date": {"type": "string", "description": "YYYY-MM-DD format, optional"},
            },
            "required": ["client_id", "document_type", "bill_to_name", "items"],
        },
    },
    {
        "name": "calculate_vat",
        "description": "Calculates VAT on a given amount using the current official rate.",
        "input_schema": {
            "type": "object",
            "properties": {
                "amount_naira": {"type": "number"},
            },
            "required": ["amount_naira"],
        },
    },
    {
        "name": "list_clients",
        "description": "Lists all clients/businesses under the user's account. Use this to find a client_id when the user refers to a client by name.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "list_deadlines",
        "description": "Lists the user's upcoming compliance deadlines.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "save_business_profile",
        "description": "Saves one or more pieces of business profile information as the user provides them during onboarding. Call this after each answer, don't wait to collect everything first.",
        "input_schema": {
            "type": "object",
            "properties": {
                "legal_structure": {
                    "type": "string",
                    "enum": [
                        "Business Name (Sole Proprietorship)",
                        "Business Name (Partnership)",
                        "Private Limited Company (Ltd)",
                        "Public Limited Company (PLC)",
                        "Limited Liability Partnership (LLP)",
                        "Limited Partnership (LP)",
                        "Incorporated Trustees",
                        "Not yet registered",
                    ],
                },
                "business_description": {"type": "string", "description": "What the business actually does, in the owner's own words"},
                "staff_size_range": {"type": "string", "enum": ["Just me", "2-5", "6-20", "21-50", "50+"]},
                "office_status": {"type": "string", "enum": ["Rented", "Owned", "Home-based", "No physical office"]},
                "state": {"type": "string", "description": "Nigerian state the business primarily operates in, e.g. Lagos, Abuja (FCT), Rivers"},
                "monthly_revenue_range": {
                    "type": "string",
                    "enum": ["Under ₦500,000", "₦500,000 - ₦2,000,000", "₦2,000,000 - ₦10,000,000", "₦10,000,000 - ₦25,000,000", "Above ₦25,000,000"],
                },
                "staff_salary_min": {"type": "integer", "description": "Lowest monthly salary paid to any staff member, in Naira. Use 0 if no paid staff."},
                "staff_salary_max": {"type": "integer", "description": "Highest monthly salary paid to any staff member, in Naira. Use 0 if no paid staff."},
                "onboarding_complete": {"type": "boolean", "description": "Set to true once all profile questions have been answered"},
            },
        },
    },

    {
        "name": "search_compliance_knowledge",
        "description": "Searches DocDuty's regulatory knowledge base (CAC, NDPA, FIRS, and other agency data) for information relevant to a compliance question. Use this whenever a user asks what they legally need to do, what licenses apply to them, or any question about business regulations — don't answer from general knowledge alone.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The compliance question or topic to search for"},
            },
            "required": ["query"],
        },
    },

    {
        "name": "get_compliance_health_score",
        "description": "Fetches the business's current Compliance Health Score, showing what they have on file and what's missing. Call this whenever the user asks how compliant they are, or after onboarding completes, to give them a real, grounded status update instead of generic capability talk.",
        "input_schema": {"type": "object", "properties": {}},
    },

    {
        "name": "get_document_link",
        "description": "Returns a link to view/download a document that was already created (invoice, receipt, quotation, contract, or privacy policy). Use this whenever the user asks to download, view, or get a link to a document you or they created.",
        "input_schema": {
            "type": "object",
            "properties": {
                "document_id": {"type": "integer", "description": "The ID of the invoice or contract"},
                "document_kind": {"type": "string", "enum": ["invoice", "contract"], "description": "Whether this is an invoice/receipt/quotation, or a contract/policy"},
            },
            "required": ["document_id", "document_kind"],
        },
    },

    {
        "name": "present_choice_options",
        "description": "Presents the user with a small set of tappable choices for a closed-ended question, instead of them having to type an exact answer. Use this for any question with a fixed set of valid options.",
        "input_schema": {
            "type": "object",
            "properties": {
                "question": {"type": "string"},
                "options": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["question", "options"],
        },
    },
    {
        "name": "draft_custom_document",
        "description": "Drafts a fully custom legal document (contract, employment letter, agreement) tailored to this specific business, when no existing template fits their exact need. This creates a DRAFT that the business owner must review and approve before it becomes final — never tell the user the document is ready to use until they've confirmed the draft.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_id": {"type": "integer"},
                "document_title": {"type": "string", "description": "e.g. 'Employment Offer Letter for Marketing Manager'"},
                "drafted_content": {"type": "string", "description": "The full drafted document text"},
            },
            "required": ["client_id", "document_title", "drafted_content"],
        },
    },

]

