from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'ordinance'
OUT.mkdir(parents=True, exist_ok=True)
doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.27), Inches(11.69)
sec.top_margin, sec.bottom_margin = Inches(.65), Inches(.65)
sec.left_margin = sec.right_margin = Inches(.72)
sec.header_distance = sec.footer_distance = Inches(.3)
for name in ['Normal', 'Title', 'Subtitle', 'Heading 1', 'Heading 2']:
    style = doc.styles[name]
    style.font.name = 'Arial'
    style.font.color.rgb = RGBColor(0, 0, 0)
for style in doc.styles:
    for border in list(style.element.iter(qn('w:pBdr'))):
        border.getparent().remove(border)
normal = doc.styles['Normal']
normal.font.size = Pt(10.5)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.06
doc.styles['Title'].font.size = Pt(19)
doc.styles['Title'].font.bold = True
doc.styles['Title'].paragraph_format.space_after = Pt(7)
doc.styles['Heading 1'].font.size = Pt(12)
doc.styles['Heading 1'].font.bold = True
doc.styles['Heading 1'].paragraph_format.space_before = Pt(11)
doc.styles['Heading 1'].paragraph_format.space_after = Pt(5)
doc.styles['Heading 2'].font.size = Pt(10.5)
doc.styles['Heading 2'].font.bold = True

header = sec.header.paragraphs[0]
header.text = 'MUNICIPALITY OF DINGALAN  |  PUBLIC EMPLOYMENT SERVICE OFFICE'
header.runs[0].font.size = Pt(8)
footer = sec.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
r = footer.add_run('PESO EC Access  •  Draft ordinance attachment  |  ')
r.font.size = Pt(8)
field = OxmlElement('w:fldSimple'); field.set(qn('w:instr'), 'PAGE')
footer._p.append(field)

def p(text, boldlead=None):
    para = doc.add_paragraph()
    if boldlead and text.startswith(boldlead):
        para.add_run(boldlead).bold = True
        para.add_run(text[len(boldlead):])
    else:
        para.add_run(text)
    return para

def heading(text):
    doc.add_heading(text, 1)

def table(headers, rows, widths):
    t = doc.add_table(rows=1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    for c, w in zip(t.columns, widths): c.width = Inches(w)
    for c, text in zip(t.rows[0].cells, headers): c.text = text
    repeat = OxmlElement('w:tblHeader'); t.rows[0]._tr.get_or_add_trPr().append(repeat)
    for row in rows:
        cells = t.add_row().cells
        for c, text in zip(cells, row): c.text = text
    for ri, row in enumerate(t.rows):
        no_split = OxmlElement('w:cantSplit'); row._tr.get_or_add_trPr().append(no_split)
        for ci, cell in enumerate(row.cells):
            cell.width = Inches(widths[ci])
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            tcpr = cell._tc.get_or_add_tcPr()
            margins = OxmlElement('w:tcMar')
            for side in ['top', 'left', 'bottom', 'right']:
                item = OxmlElement('w:' + side); item.set(qn('w:w'), '85'); item.set(qn('w:type'), 'dxa'); margins.append(item)
            tcpr.append(margins)
            borders = OxmlElement('w:tcBorders')
            for side in ['top', 'left', 'bottom', 'right']:
                b = OxmlElement('w:' + side); b.set(qn('w:val'), 'single'); b.set(qn('w:sz'), '4'); b.set(qn('w:color'), 'D9D9D9'); borders.append(b)
            tcpr.append(borders)
            shade = OxmlElement('w:shd'); shade.set(qn('w:fill'), 'E7EBEF' if ri == 0 else 'FFFFFF'); tcpr.append(shade)
            for para in cell.paragraphs:
                para.paragraph_format.space_after = Pt(1)
                para.paragraph_format.line_spacing = 1.0
                for run in para.runs:
                    run.font.size = Pt(9.5)
                    if ri == 0: run.bold = True
    return t

def page(): doc.add_page_break()

p('ANNEX A  |  PROPOSED MUNICIPAL ORDINANCE ATTACHMENT').runs[0].font.size = Pt(9)
doc.add_paragraph('PESO EC Access', 'Title')
p('An innovative digitalization initiative for public employment services in Dingalan').runs[0].bold = True
p('System functions, stakeholder benefits, service modules, access controls, privacy requirements and offline field operations')

heading('Purpose and local development')
p('PESO EC Access is a locally developed digital platform that supports the Municipality of Dingalan in organizing public employment services, administering employment assistance, documenting field activities and responding to citizens. It supports the PESO mandate under Republic Act No. 8759, as amended by Republic Act No. 10691. Its implemented core covers EC TUPAD Management and Migrants’ Corner, with four additional service modules identified for phased development. [1]')
p('Based on the project description supplied by PESO Dingalan, the system was designed and developed locally through the combined work of the PESO Manager, a job order developer and PESO system analysis personnel. It is a customized, field-tested local initiative whose initial features were created with minimal development expenses. This approach applies direct operational experience to local workflows and enables improvements in response to actual field needs. Actual expenditures and field-test results should be supported by municipal project records.')

heading('Uses and advantages for stakeholders')
p('For the LGU. Consolidates program records and implementation evidence for management review, planning and accountability. Digital records can reduce repeated encoding, manual consolidation and paper handling. Local development supports customization and retention of technical knowledge within the municipality; maintenance, hosting, equipment and security still require continuing support.', 'For the LGU.')
p('For PESO Dingalan. Provides a coordinated workflow for intake, masterlists, work assignments, QR verification, attendance, accomplishment documentation and reporting. Staff can retrieve records and identify missing requirements more readily, while authorized personnel can review corrections, replacements and transaction history.', 'For PESO Dingalan.')
p('For DOLE. Supports monitoring through organized beneficiary, attendance, payout-verification and accomplishment records, including exports using the supplied DOLE workbook. It facilitates documentary review and coordination with PESO. Outputs remain subject to validation and current DOLE requirements; direct integration with national systems is not established by this review.', 'For DOLE.')
p('For the general public. Offers online application, application-status inquiry, work-assignment lookup and a public inquiry channel, alongside assisted walk-in intake. QR field verification can shorten repetitive identification procedures. Prepared field devices support service continuity in areas with unreliable connectivity, helping residents avoid unnecessary repeat visits.', 'For the general public.')

page()
heading('Brief presentation of the six service modules')
p('The following status reflects the reviewed application source as of 23 November 2026. Implemented functionality is distinct from planned expansion; this attachment does not certify production readiness or completed acceptance testing.')
table(['Module and status', 'Functions and practical use'], [
('1  EC TUPAD Management\nImplemented', 'Manages programs, applications, beneficiary masterlists, work plans and groupings, QR cards and stubs, orientation, AM/PM attendance, accomplishment photos, replacements, configured eligibility restrictions, payout verification and reports. Supports traceable administration of emergency employment.'),
('2  DAMA E-Trabaho Job Matching\nUnder development', 'Planned vacancy and employer registry, jobseeker skills pool, candidate matching and referrals, including proposed National Skills Registration Program linkage. Intended to help PESO connect residents with suitable employment; automated matching and national linkage remain planned.'),
('3  Technical Skills Accreditation\nUnder development', 'Planned training and course registry, assessment schedules and certification tracking. Intended to help PESO coordinate skills development and referrals with training partners. Official competency assessment and certification remain with authorized institutions.'),
('4  SPES GIP DILEEP and Career Guidance\nUnder development', 'Planned monitoring for the Special Program for Employment of Students, Government Internship Program, DOLE Integrated Livelihood and Emergency Employment Program, and career guidance. Intended to improve youth and livelihood service coordination.'),
('5  Migrants’ Corner or OFW Helpdesk\nImplemented', 'Provides OFW Family Circle registration, case-assistance intake and Balik Pinas livelihood application records, with personnel registry views. Supports local documentation, referral and assistance coordination for migrant workers and families; partner agencies retain approval authority.'),
('6  Public Services Digitalization or PESO GovTech\nUnder development', 'Planned interoffice data exchange, SMS or push advisories and barangay service kiosks. Intended to extend access and improve coordination, subject to resources, privacy safeguards and authorized data-sharing arrangements.')
], [2.06, 4.77])
heading('Key functions within EC TUPAD Management')
p('Intake and review. Online and assisted walk-in submissions, document attachment, guided ID capture and optical character recognition (OCR) assist data collection. New submissions enter pending review; OCR and submission do not approve applicants or enroll them in a program.', 'Intake and review.')
p('Field records and integrity. Registered QR codes identify the relevant program and enrolment. Scanning supports stub distribution, orientation, daily attendance and payout verification. Work assignments and accomplishment photos support implementation evidence. Restriction checks and replacement workflows assist screening, subject to current DOLE rules and authorized review.', 'Field records and integrity.')
p('Reports and administration. Dashboards, attendance matrices, program-specific exports, DOLE workbook preparation, user administration and audit records support monitoring. Payout verification records payment activity; it does not itself transfer funds. Exported reports require review before official submission.', 'Reports and administration.')

page()
heading('Offline capability and service continuity')
p('PESO EC Access supports offline field operations on previously prepared devices. Its browser application uses cached pages and a local device database to retain program references and queue supported transactions. This reduces dependence on a continuous internet connection during field work.')
p('Before deployment, authorized personnel must sign in, load the required field pages and run Master Sync while connected. This downloads the necessary programs, active beneficiary references, registered QR identities, schedules and work assignments. Devices should be synchronized again after relevant roster or QR-registration changes.')
p('During an outage, supported workflows can use cached QR and beneficiary references for stub distribution, orientation, attendance and payout-verification recording. Accomplishment photos can be retained locally for later upload. Local checks can identify duplicates already known to that device. Queued records preserve their program context for later server validation.')
p('When connectivity returns, automatic or manual synchronization sends queued transactions to the server. The Sync Center displays pending, failed or conflicting items for follow-up. Records captured separately on disconnected devices require reconciliation; an offline confirmation is not proof that all devices or the central database already contain the transaction.')
p('Operational limits. Initial setup, fresh authentication, current public inquiries, server-dependent submissions and central consolidation require connectivity to their services. A locally running application still needs access to its configured database and storage; the current design does not establish a fully independent offline municipal server. Device storage, power and browser permissions remain necessary. Unsynchronized data must be protected from device loss or browser-data deletion.', 'Operational limits.')

heading('Role based access')
p('The system defines six personnel roles and checks permissions in server endpoints as well as the interface. The following summarizes their intended operational use; detailed permissions govern each action.')
table(['Role', 'Access and responsibility'], [
('Domain Master', 'Broad system administration, users, configuration, records, reports, audit review and synchronization controls.'),
('PESO Admin', 'Broad program and beneficiary administration, application review, operational corrections, reports and user management. The current permission model also grants extensive system access.'),
('PESO Staff', 'Authorized encoding, beneficiary updates, field operations, selected corrections, reporting and migrant-service records; excludes general user and system-setting administration.'),
('TUPAD Coordinator', 'Field verification, stub distribution, orientation, attendance, photos, payout recording, work-program viewing and assisted intake, within assigned operational scope.'),
('Assisting Documentor', 'Attendance and photo documentation, work-program viewing and assisted intake, with fewer field permissions than a coordinator.'),
('DOLE Coordinator', 'Monitoring and report preparation, limited beneficiary and restriction views, and assisted intake. Access does not make DOLE the system administrator.')
], [1.62, 5.21])
p('Public users access designated application and inquiry services rather than personnel administration. Online and walk-in submission inboxes and review actions are reserved to Domain Master and PESO Admin; other authorized encoders have restricted access to their own walk-in documents. The LGU should approve least-privilege assignments and review access regularly.')

page()
heading('Security safeguards and privacy compliance')
p('Existing safeguards. The reviewed source includes signed personnel sessions, password-hash verification, permission checks, audit records, private application-document storage and restricted document retrieval. New registered QR tokens omit beneficiary names and birthdays; program identity and duplicate checks help prevent incorrect attribution. These controls support accountability but do not establish complete legal compliance.', 'Existing safeguards.')
p('Required compliance framework. Processing must comply with Republic Act No. 10173, its Implementing Rules and Regulations, and applicable NPC issuances, including NPC Circular No. 2023-06 on security of personal data. The LGU, through its responsible officials and Data Protection Officer, must establish lawful processing purposes, clear privacy notices, appropriate consent where required, data minimization, access controls, retention and disposal rules, and procedures for data-subject requests. [2–4]', 'Required compliance framework.')
p('Institutional responsibilities. Maintain a Privacy Impact Assessment and Privacy Management Program; fulfill applicable DPO and data-processing-system registration obligations; train personnel; control exports and sharing; and document backup, recovery and incident response. Offline devices and removable copies must be included in these controls. Sharing with DOLE or other partners must have an appropriate lawful basis and documented safeguards. [2–5]', 'Institutional responsibilities.')
p('Items requiring remediation or verification. Readable passwords are retained in the current design and must be removed. Production authentication secrets must be mandatory and securely managed, and preset credentials must be replaced. The LGU must verify encryption in transit and at rest, protection of locally cached data, session revocation, public-inquiry disclosure controls and effective permission boundaries. No independent security audit, NPC certification or complete compliance determination is established by this source review.', 'Items requiring remediation or verification.')

heading('Suggested institutionalization provision')
p('“The Municipality shall recognize PESO EC Access as its locally developed platform supporting the digitalization of public employment services, under the operational administration of PESO Dingalan and the applicable municipal governance structure. Implementation and expansion shall be phased, subject to approved resources, acceptance testing, current DOLE program rules, and applicable privacy and security requirements. The Municipality shall provide for authorized access, personnel training, maintenance, records management, offline field procedures, synchronization, and continuity of service.”')
p('The ordinance can recognize the local development team’s contribution and provide continuing support for improvements. National-agency program decisions and legally required review remain with the competent authorities. This proposed wording is for municipal legislative and legal review.')

heading('Legal and technical references')
refs = [
('[1] Republic Act No. 10691 amending the PESO Act of 1999', 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/65046'),
('[2] Republic Act No. 10173 or the Data Privacy Act of 2012', 'https://privacy.gov.ph/data-privacy-act/'),
('[3] Implementing Rules and Regulations of RA 10173', 'https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/'),
('[4] NPC Circular No. 2023-06 on security of personal data', 'https://privacy.gov.ph/wp-content/uploads/2024/03/NPC-Circular-Repeal-16-01-Signed.pdf'),
('[5] NPC guidance on DPO and processing-system registration under Circular 2022-04', 'https://privacy.gov.ph/reminder-on-mandatory-data-protection-officer-and-data-processing-system-registration/'),
]
for label, url in refs:
    para = doc.add_paragraph()
    para.paragraph_format.space_after = Pt(3)
    link = OxmlElement('w:hyperlink')
    rid = para.part.relate_to(url, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink', is_external=True)
    link.set(qn('r:id'), rid)
    run = OxmlElement('w:r'); props = OxmlElement('w:rPr')
    size = OxmlElement('w:sz'); size.set(qn('w:val'), '17'); props.append(size)
    run.append(props); txt = OxmlElement('w:t'); txt.text = label; run.append(txt); link.append(run); para._p.append(link)
p('Technical basis: application source and project documentation, including module menus and public module cards; permissions and authentication; application intake; program QR lifecycle; field workflows; offline database and Sync Center; and DOLE report documentation. Review date: 23 November 2026. Development history, field testing and minimal initial expense are based on PESO Dingalan’s supplied description. Benefits are expected operational advantages; no measured savings or performance results are asserted.').runs[0].font.size = Pt(8)

doc.core_properties.title = 'PESO EC Access ordinance attachment'
doc.core_properties.subject = 'Functions benefits modules access privacy and offline capabilities'
doc.core_properties.author = 'PESO Dingalan'
doc.core_properties.keywords = 'PESO EC Access, Dingalan, ordinance attachment'
target = OUT / 'PESO-EC-Access-Ordinance-Attachment.docx'
doc.save(target)
print(target)
print('Words:', sum(len(p.text.split()) for p in doc.paragraphs) + sum(len(c.text.split()) for t in doc.tables for row in t.rows for c in row.cells))
