import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

DOCX_PATH = r"C:\Aguna_Projects\Musashi Data\Musashi_Dispatch_POC_User_Guide.docx"
SCREENSHOT_DIR = r"C:\Aguna_Projects\Musashi Data\screenshots"

# Color Palette
HEX_RED = "D40511"       # Musashi/DHL Accent Red
HEX_DARK_RED = "AB0410"
HEX_SLATE = "1E293B"     # Primary Headings & Dark Text
HEX_TEXT = "334155"      # Body Text
HEX_MUTED = "64748B"     # Secondary/Muted Text
HEX_BG_LIGHT = "F8FAFC"  # Light Table Header / Callout BG
HEX_LINE = "E2E8F0"      # Subtle Border
HEX_GREEN = "059669"
HEX_AMBER = "D97706"

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def set_table_borders(table, color="D0D5DD", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:left w:val="none"/>
            <w:right w:val="none"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def add_callout(doc, title, text, border_color="D40511", bg_color="FEF2F2"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=160)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>
            <w:top w:val="none"/>
            <w:bottom w:val="none"/>
            <w:right w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    run_title = p.add_run(f"{title}: ")
    run_title.bold = True
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(10.5)
    run_title.font.color.rgb = RGBColor.from_string(border_color)
    
    run_text = p.add_run(text)
    run_text.font.name = "Calibri"
    run_text.font.size = Pt(10)
    run_text.font.color.rgb = RGBColor.from_string(HEX_TEXT)

    # Empty spacing paragraph after table
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(6)

def add_screenshot_figure(doc, image_name, caption_text, figure_num):
    img_path = os.path.join(SCREENSHOT_DIR, image_name)
    if not os.path.exists(img_path):
        p_err = doc.add_paragraph(f"[Image {image_name} not found]")
        return
    
    # Bordered container table for screenshot
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "FAFAFA")
    set_cell_margins(cell, top=80, bottom=80, left=80, right=80)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run()
    run.add_picture(img_path, width=Inches(6.3))
    
    # Caption paragraph below screenshot
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(4)
    p_cap.paragraph_format.space_after = Pt(14)
    
    run_fig = p_cap.add_run(f"Figure {figure_num}: ")
    run_fig.bold = True
    run_fig.font.name = "Calibri"
    run_fig.font.size = Pt(9.5)
    run_fig.font.color.rgb = RGBColor.from_string(HEX_RED)
    
    run_cap = p_cap.add_run(caption_text)
    run_cap.italic = True
    run_cap.font.name = "Calibri"
    run_cap.font.size = Pt(9.5)
    run_cap.font.color.rgb = RGBColor.from_string(HEX_MUTED)

def create_document():
    doc = docx.Document()
    
    # Page setup: Standard Letter, 0.75-inch margins for clean technical layout
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)
        
        # Configure Header and Footer
        header = section.header
        p_hdr = header.paragraphs[0]
        p_hdr.text = "Musashi Auto Parts · Dispatch & Return Verification POC Guide"
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p_hdr.runs[0].font.name = "Calibri"
        p_hdr.runs[0].font.size = Pt(8.5)
        p_hdr.runs[0].font.color.rgb = RGBColor.from_string(HEX_MUTED)
        
        footer = section.footer
        p_ftr = footer.paragraphs[0]
        p_ftr.text = "Musashi Bawal Plant · Gate 02 Operations · Confidential Demo POC"
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_ftr.runs[0].font.name = "Calibri"
        p_ftr.runs[0].font.size = Pt(8.5)
        p_ftr.runs[0].font.color.rgb = RGBColor.from_string(HEX_MUTED)

    # -------------------------------------------------------------
    # COVER / HEADER BLOCK
    # -------------------------------------------------------------
    p_badge = doc.add_paragraph()
    p_badge.paragraph_format.space_before = Pt(10)
    p_badge.paragraph_format.space_after = Pt(4)
    run_badge = p_badge.add_run("SYSTEM OPERATIONS & WALKTHROUGH MANUAL")
    run_badge.bold = True
    run_badge.font.name = "Calibri"
    run_badge.font.size = Pt(11)
    run_badge.font.color.rgb = RGBColor.from_string(HEX_RED)

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    p_title.paragraph_format.line_spacing = 1.05
    run_title = p_title.add_run("Musashi Dispatch & Return Verification System")
    run_title.bold = True
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(24)
    run_title.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(14)
    run_sub = p_sub.add_run("Step-by-Step Operator Guide: Carrier Vehicle Requests, Gate Verification, Fixed & Variable Kilometre Routes, Empty Bin Returns, and Billing Reconciliation")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(12)
    run_sub.font.color.rgb = RGBColor.from_string(HEX_MUTED)

    # Metadata Table
    meta_tbl = doc.add_table(rows=4, cols=2)
    meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_data = [
        ("Plant Location:", "Musashi Auto Parts India · Bawal Plant (Gate 02 · Line A)"),
        ("System Architecture:", "Single-Page Front-End Proof of Concept (HTML, Vanilla JS, CSS)"),
        ("Active Release:", "POC v1.2 (With Route Distance Audit & Gate-In Return Verification)"),
        ("Target Roles:", "Transporter Carrier Portal, Musashi Dispatch Gate, Admin Billing Office")
    ]
    for i, (label, val) in enumerate(meta_data):
        row = meta_tbl.rows[i]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = Inches(1.8), Inches(4.7)
        set_cell_background(c0, "F1F5F9")
        set_cell_background(c1, "F8FAFC")
        set_cell_margins(c0, top=70, bottom=70, left=100, right=100)
        set_cell_margins(c1, top=70, bottom=70, left=100, right=100)
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(label)
        r0.bold = True
        r0.font.name = "Calibri"
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor.from_string(HEX_SLATE)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(val)
        r1.font.name = "Calibri"
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = RGBColor.from_string(HEX_TEXT)

    set_table_borders(meta_tbl, color="CBD5E1")

    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(14)
    p_div.paragraph_format.space_after = Pt(10)

    # -------------------------------------------------------------
    # 1. EXECUTIVE SUMMARY & WORKFLOW
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r = h1.add_run("1. Executive Summary & Core Workflow")
    r.font.name = "Calibri"
    r.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "The Musashi Product Dispatch POC provides a streamlined, paperless workflow for automotive product "
        "dispatch and empty bin management at the Bawal plant. The application coordinates the complete lifecycle "
        "of a dispatch run across three distinct operational roles:"
    )

    flow_items = [
        ("Step 1 · Vehicle Nomination (Transporter):", " Carriers send trucks and drivers to the plant gate on request without requiring destination or customer data upfront."),
        ("Step 2 · Gate 02 Departure Verification (Dispatch):", " Musashi dispatch verifies truck credentials, records the destination customer, automatically handles fixed vs. variable route kilometres, and calculates the bin split (Loaded vs. Customer Delivered vs. Returning bins)."),
        ("Step 3 · Transporter GRN Generation:", " The system issues an unambiguous, carrier-scoped Good Receipt Note (e.g. STC-0025, DLV-0019) incrementing that carrier's isolated sequence."),
        ("Step 4 · Fleet In Transit Tracking:", " Trucks en route to customer sites appear in the dedicated 'Truck Arrival & Returns' workspace."),
        ("Step 5 · Gate-In Return Verification & Bin Audit:", " When trucks return to Musashi (even if zero bins return), Gate 02 audits physical bins returned (empty vs. material/rejected), enters or confirms actual kilometres travelled, and completes the trip."),
        ("Step 6 · Billing Reconciliation (Admin):", " The trip enters a 14-column live reconciliation ledger ready for CSV billing export.")
    ]
    for bold_text, desc_text in flow_items:
        pf = doc.add_paragraph(style='List Bullet')
        pf.paragraph_format.space_after = Pt(3)
        pf.paragraph_format.line_spacing = 1.15
        rb = pf.add_run(bold_text)
        rb.bold = True
        rb.font.name = "Calibri"
        rb.font.color.rgb = RGBColor.from_string(HEX_SLATE)
        rd = pf.add_run(desc_text)
        rd.font.name = "Calibri"
        rd.font.color.rgb = RGBColor.from_string(HEX_TEXT)

    add_callout(
        doc,
        "Key Enhancement in this Version",
        "This release implements fixed vs. variable kilometre route logic (e.g., Gurgaon Hero Honda locked at 90 km vs. Gujarat variable distance) and full bin accounting where returning bins are tracked, reconciled, and audited upon truck arrival.",
        border_color=HEX_RED,
        bg_color="FEF2F2"
    )

    # -------------------------------------------------------------
    # 2. ROLE-BASED ACCESS & SIGN IN
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r = h1.add_run("2. Role-Based Access Control & Demo Accounts")
    r.font.name = "Calibri"
    r.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "Access to the system is strictly role-scoped. To facilitate demonstration, one-click demo credentials "
        "are provided directly on the sign-in screen:"
    )

    # Role Accounts Table
    role_tbl = doc.add_table(rows=5, cols=4)
    role_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    role_headers = ["Workspace / Role", "Username", "Password", "Carrier / Operational Scope"]
    hdr_row = role_tbl.rows[0]
    for j, h in enumerate(role_headers):
        c = hdr_row.cells[j]
        set_cell_background(c, HEX_SLATE)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    role_rows_data = [
        ("Transporter Portal", "stc", "demo1234", "STC Services (Own vehicles & issued trips only)"),
        ("Transporter Portal", "dlv", "demo1234", "Delhivery Freight (Own vehicles & issued trips only)"),
        ("Musashi Dispatch", "dispatch", "demo1234", "Gate 02 Verification, Departure GRN & Arrival Return Audit"),
        ("Admin Dashboard", "admin", "demo1234", "Plant-wide Reconciliation Ledger, Metrics & CSV Billing Export")
    ]
    for i, row_data in enumerate(role_rows_data):
        row = role_tbl.rows[i + 1]
        bg = "FFFFFF" if i % 2 == 0 else "F8FAFC"
        for j, val in enumerate(row_data):
            c = row.cells[j]
            set_cell_background(c, bg)
            set_cell_margins(c, top=70, bottom=70, left=100, right=100)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor.from_string(HEX_TEXT)
            if j in (1, 2):
                r.bold = True
                r.font.name = "Consolas"

    set_table_borders(role_tbl, color="CBD5E1")

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(8)

    add_screenshot_figure(
        doc,
        "01_login_screen.png",
        "Sign-in screen showing role-based cards for STC Services, Delhivery Freight, Dispatch, and Admin.",
        1
    )

    add_screenshot_figure(
        doc,
        "02_login_stc_selected.png",
        "Selecting an account card instantly populates demo credentials and highlights the target workspace.",
        2
    )

    # -------------------------------------------------------------
    # 3. TRANSPORTER PORTAL
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r = h1.add_run("3. Transporter Portal: Vehicle Requests")
    r.font.name = "Calibri"
    r.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "Carriers use the Transporter Portal to submit trucks and drivers to Gate 02 in response to Musashi's "
        "daily line pickup calls. To keep operations agile, transporters are NOT required to guess or enter "
        "customer destinations, DL numbers, or invoice data."
    )

    tp_points = [
        ("Simplified Submission:", " The transporter enters only the Vehicle Plate Number (e.g. HR47F9988) and Driver Full Name."),
        ("Format Validation & Duplicate Blocking:", " Plate formats follow Indian registration standards. Vehicles already queued at Gate 02 cannot be submitted twice."),
        ("Real-time Gate Queue:", " The 'At the gate' live panel displays currently queued vehicles, wait times, queue health status, and the carrier's next upcoming GRN number."),
        ("Completed Trips Ledger:", " Below the form, the transporter sees only their own historical dispatches, including GRN numbers, delivered bins, and returning bin counts.")
    ]
    for b_title, b_desc in tp_points:
        pf = doc.add_paragraph(style='List Bullet')
        pf.paragraph_format.space_after = Pt(3)
        pf.paragraph_format.line_spacing = 1.15
        rb = pf.add_run(b_title)
        rb.bold = True
        rb.font.name = "Calibri"
        rb.font.color.rgb = RGBColor.from_string(HEX_SLATE)
        rd = pf.add_run(b_desc)
        rd.font.name = "Calibri"
        rd.font.color.rgb = RGBColor.from_string(HEX_TEXT)

    add_screenshot_figure(
        doc,
        "03_transporter_portal.png",
        "Transporter Portal for STC Services displaying the nomination form, live gate queue, and past trips.",
        3
    )

    add_screenshot_figure(
        doc,
        "04_transporter_form_filled.png",
        "Entering a vehicle number and driver name to queue the truck at Musashi Gate 02.",
        4
    )

    # -------------------------------------------------------------
    # 4. MUSASHI DISPATCH WORKSPACE & DEPARTURE
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r = h1.add_run("4. Musashi Dispatch: Gate 02 Departure Operations")
    r.font.name = "Calibri"
    r.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "Logged in as Musashi Dispatch (`dispatch`), the operator views the plant-wide queue of waiting vehicles "
        "arriving from all authorized carriers. Waiting cards are sorted chronologically in First-In, First-Out (FIFO) "
        "order to ensure fair truck handling."
    )

    add_screenshot_figure(
        doc,
        "05_dispatch_workspace.png",
        "Musashi Dispatch workspace displaying waiting vehicle requests, waiting counts, and recent GRN history.",
        5
    )

    # -------------------------------------------------------------
    # 5. FIXED VS VARIABLE KILOMETRES & BIN SPLIT
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r = h1.add_run("5. Gate Verification Modal: Route Distance & Bin Accounting")
    r.font.name = "Calibri"
    r.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "When the operator clicks 'Verify & dispatch' on any queued vehicle, the Gate Verification dialog opens. "
        "This modal captures the operational load parameters:"
    )

    param_list = [
        ("Destination Customer Selection:", " Selecting a customer auto-populates their facility city and determines distance rules."),
        ("Fixed Route Kilometres (e.g. Hero Honda, Gurgaon = 90 km):", " For pre-contracted routes, the distance locks automatically and prevents manual tampering."),
        ("Variable Route Kilometres (e.g. Tata Motors / Gujarat):", " For remote or multi-point destinations, kilometres are not fixed. The operator can enter estimated kilometres now or leave the field blank to be filled upon truck return."),
        ("3-Way Bin Accounting:", " Operator enters 'Total bins loaded' (e.g. 100) and 'Bins for customer' (e.g. 80). The system immediately calculates 'Returning bins' = 20 bins. If all 100 bins are for the customer, returning bins is 0."),
        ("Tax Invoice & Driver DL Verification:", " Driver ID is checked against physical licence and external SAP/ERP tax invoice number is entered.")
    ]
    for p_title, p_desc in param_list:
        pf = doc.add_paragraph(style='List Bullet')
        pf.paragraph_format.space_after = Pt(3)
        pf.paragraph_format.line_spacing = 1.15
        rb = pf.add_run(p_title)
        rb.bold = True
        rb.font.name = "Calibri"
        rb.font.color.rgb = RGBColor.from_string(HEX_SLATE)
        rd = pf.add_run(p_desc)
        rd.font.name = "Calibri"
        rd.font.color.rgb = RGBColor.from_string(HEX_TEXT)

    add_screenshot_figure(
        doc,
        "06_dispatch_modal_fixed_km.png",
        "Gate Dispatch Modal with Hero Honda selected: Location (Gurgaon, Haryana) and Distance (90 km locked) auto-fill.",
        6
    )

    add_screenshot_figure(
        doc,
        "07_dispatch_modal_variable_km.png",
        "Gate Dispatch Modal with Tata Motors selected: Distance is editable for Gujarat, allowing entry now or on return.",
        7
    )

    # -------------------------------------------------------------
    # 6. TRUCK ARRIVAL & RETURN VERIFICATION
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r = h1.add_run("6. Truck Arrival & Returns: Gate-In Verification Workspace")
    r.font.name = "Calibri"
    r.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "Once dispatched, the truck's status becomes 'In Transit'. Dispatched trucks appear in the newly added "
        "'Truck Arrival & Returns' workspace tab. This view gives dispatchers complete visibility into all vehicles "
        "currently on the road."
    )

    add_screenshot_figure(
        doc,
        "08_returns_workspace.png",
        "Truck Arrival & Returns workspace displaying vehicles en route, bin splits, and recent verified arrivals.",
        8
    )

    h2 = doc.add_heading(level=2)
    h2.paragraph_format.space_before = Pt(12)
    h2.paragraph_format.space_after = Pt(4)
    r = h2.add_run("Gate-In Inspection & Empty Bin Audit")
    r.font.name = "Calibri"
    r.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "When the vehicle completes delivery at the customer facility, it returns to Musashi Bawal Gate 02. "
        "Even if zero bins are returned, the truck MUST report for final gate-in verification. "
        "Clicking 'Verify return' opens the Gate-In verification modal:"
    )

    ret_features = [
        ("Actual Distance Confirmation:", " If the route was variable (Gujarat) and kilometres were not fixed, the gate officer enters or confirms the final odometer kilometres."),
        ("Physical Bin Counting:", " Gate security/store staff count the returning bins. If the physical count matches expected bins, a green confirmation note displays."),
        ("Discrepancy / Mismatch Detection:", " If bins returned differ from expected (e.g. 18 bins physically returned instead of 20), an amber warning triggers instantly and records the variance into the audit trail."),
        ("Bin Condition Categorization:", " Categorizes bins as 'Empty bins (ready for reuse)', 'Contains material (rejected/returned parts)', or 'No bins returned (0 bins)'.")
    ]
    for rf_title, rf_desc in ret_features:
        pf = doc.add_paragraph(style='List Bullet')
        pf.paragraph_format.space_after = Pt(3)
        pf.paragraph_format.line_spacing = 1.15
        rb = pf.add_run(rf_title)
        rb.bold = True
        rb.font.name = "Calibri"
        rb.font.color.rgb = RGBColor.from_string(HEX_SLATE)
        rd = pf.add_run(rf_desc)
        rd.font.name = "Calibri"
        rd.font.color.rgb = RGBColor.from_string(HEX_TEXT)

    add_screenshot_figure(
        doc,
        "09_return_modal_verified.png",
        "Gate-In Return Modal: 20 bins physically returned matching expected count, with distance confirmation.",
        9
    )

    add_screenshot_figure(
        doc,
        "10_return_modal_mismatch.png",
        "Discrepancy handling: Entering 18 bins triggers an amber warning flagging a shortage of 2 bins.",
        10
    )

    # -------------------------------------------------------------
    # 7. ADMIN DASHBOARD & RECONCILIATION LEDGER
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r = h1.add_run("7. Admin Dashboard: Reconciliation Ledger & Export")
    r.font.name = "Calibri"
    r.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run(
        "The Admin Dashboard provides plant leadership and finance teams with a consolidated single-pane-of-glass "
        "reconciliation ledger. Every completed run is recorded with its permanent transporter GRN, distance, and bin audit."
    )

    add_screenshot_figure(
        doc,
        "11_admin_dashboard.png",
        "Admin Dashboard displaying the 6 live operational metrics, the 14-column ledger, and carrier sequence counters.",
        11
    )

    add_screenshot_figure(
        doc,
        "12_admin_filtered.png",
        "Filtering the reconciliation ledger by destination customer (Hero Honda) and exporting audit CSV.",
        12
    )

    # 14 Columns Reference Table
    h2 = doc.add_heading(level=2)
    h2.paragraph_format.space_before = Pt(12)
    h2.paragraph_format.space_after = Pt(4)
    r = h2.add_run("Reconciliation Ledger Columns Reference")
    r.font.name = "Calibri"
    r.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    col_tbl = doc.add_table(rows=8, cols=2)
    col_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_hdr = col_tbl.rows[0]
    col_hdr.cells[0].width, col_hdr.cells[1].width = Inches(2.2), Inches(4.3)
    set_cell_background(col_hdr.cells[0], HEX_SLATE)
    set_cell_background(col_hdr.cells[1], HEX_SLATE)
    set_cell_margins(col_hdr.cells[0], top=80, bottom=80, left=100, right=100)
    set_cell_margins(col_hdr.cells[1], top=80, bottom=80, left=100, right=100)
    
    col_hdr.cells[0].paragraphs[0].add_run("Column Group").bold = True
    col_hdr.cells[0].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
    col_hdr.cells[1].paragraphs[0].add_run("Fields Included & Description").bold = True
    col_hdr.cells[1].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)

    col_data = [
        ("Trip & Carrier Identity", "Date, Trip ID (D-1001), Transporter Name (STC / Delhivery), Vehicle Registration Number."),
        ("Driver & Licencing", "Driver Full Name and Verified Driver Driving Licence / National ID."),
        ("Route & Destination", "Destination Customer Name, Facility City / Plant Location, and Total Route Distance (km)."),
        ("Invoice Association", "External Musashi Tax Invoice Number generated from SAP/ERP billing."),
        ("3-Way Bin Accounting", "Loaded Bins (outbound from plant), Delivered Bins (accepted by customer), Returned Bins (physically returned to gate)."),
        ("Transporter GRN", "Permanent carrier-wise sequential GRN (e.g. STC-0025, DLV-0019)."),
        ("Status & Verification Timestamp", "Trip Status ('Verified' or 'In transit') and Gate-In Completion Timestamp with bin condition notes.")
    ]
    for i, (g_name, g_desc) in enumerate(col_data):
        row = col_tbl.rows[i + 1]
        bg = "FFFFFF" if i % 2 == 0 else "F8FAFC"
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = Inches(2.2), Inches(4.3)
        set_cell_background(c0, bg)
        set_cell_background(c1, bg)
        set_cell_margins(c0, top=60, bottom=60, left=100, right=100)
        set_cell_margins(c1, top=60, bottom=60, left=100, right=100)
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_after = Pt(0)
        r0 = p0.add_run(g_name)
        r0.bold = True
        r0.font.name = "Calibri"
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = RGBColor.from_string(HEX_SLATE)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(g_desc)
        r1.font.name = "Calibri"
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = RGBColor.from_string(HEX_TEXT)

    set_table_borders(col_tbl, color="CBD5E1")

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(8)

    # -------------------------------------------------------------
    # 8. MASTER DATA REFERENCE TABLE & EQUATIONS
    # -------------------------------------------------------------
    h1 = doc.add_heading(level=1)
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r = h1.add_run("8. Master Data Reference & Equations")
    r.font.name = "Calibri"
    r.font.color.rgb = RGBColor.from_string(HEX_SLATE)

    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(8)
    p.add_run("The following customer destinations and distance rules are configured in the POC:")

    # Customer Reference Table
    cust_tbl = doc.add_table(rows=6, cols=4)
    cust_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_hdr = cust_tbl.rows[0]
    for j, h in enumerate(["Customer Name", "Customer Code", "Plant / City Location", "Distance Rule (km)"]):
        c = c_hdr.cells[j]
        set_cell_background(c, HEX_SLATE)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(h)
        r.bold = True
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    cust_data = [
        ("Hero Honda", "HH", "Gurgaon, Haryana", "Fixed · 90 km (Auto-locked)"),
        ("Maruti Suzuki", "MSIL", "Manesar, Haryana", "Fixed · 45 km (Auto-locked)"),
        ("FCC Clutch India", "FCC", "Tapukara, Rajasthan", "Fixed · 70 km (Auto-locked)"),
        ("Tata Motors", "TML", "Sanand, Gujarat", "Variable · Not fixed (Entered at gate/return)"),
        ("JCB India", "JCB", "Vadodara, Gujarat", "Variable · Not fixed (Entered at gate/return)")
    ]
    for i, r_data in enumerate(cust_data):
        row = cust_tbl.rows[i + 1]
        bg = "FFFFFF" if i % 2 == 0 else "F8FAFC"
        for j, val in enumerate(r_data):
            c = row.cells[j]
            set_cell_background(c, bg)
            set_cell_margins(c, top=60, bottom=60, left=100, right=100)
            p = c.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(val)
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor.from_string(HEX_TEXT)
            if j == 3 and "Fixed" in val:
                r.bold = True
                r.font.color.rgb = RGBColor.from_string(HEX_GREEN)
            elif j == 3 and "Variable" in val:
                r.bold = True
                r.font.color.rgb = RGBColor.from_string(HEX_AMBER)

    set_table_borders(cust_tbl, color="CBD5E1")

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(8)

    add_callout(
        doc,
        "Operational Math Reference",
        "1. Returning Bins Formula: Returning Bins = Loaded Bins − Delivered Bins\n"
        "2. Carrier GRN Formula: GRN = [Carrier Code] + '-' + ZeroPad(Sequence + 1, 4) (e.g. STC-0025, DLV-0019)\n"
        "3. Gate-In Completion Rule: Every dispatched vehicle must complete Gate-In return verification at Gate 02, whether returning with empty bins, material bins, or 0 bins.",
        border_color=HEX_DARK_RED,
        bg_color="FFF1F2"
    )

    # Save document
    doc.save(DOCX_PATH)
    print(f"Document successfully created at: {DOCX_PATH}")

if __name__ == "__main__":
    create_document()
