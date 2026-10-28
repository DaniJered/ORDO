import json
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.entities import (
    Department, User, Event, EventParticipant, Task, TaskDependency,
    EvidenceRequirement, Contact, ContactChannel, EventTemplate,
    CommunicationDraft, AttachmentsTextCache, FeatureFlag, IntegrationSettings
)
from app.core.security import hash_password

DEMO_PASSWORD = "Password123!"

def seed_database(db: Session):
    # Check if already seeded
    if db.query(User).count() > 0:
        return

    now = datetime.now(timezone.utc)

    # 1. Departments (4)
    technical = Department(name="Technical", description="Sound, Stage, Audio/Visual, and Network setup", color_tag="indigo")
    logistics = Department(name="Logistics", description="Venue, Transport, Security, and Hospitality", color_tag="amber")
    marketing = Department(name="Marketing", description="Design, Sponsorships, Social Media, and Posters", color_tag="rose")
    finance = Department(name="Finance", description="Budget allocation, Invoices, Advances, and Reimbursements", color_tag="emerald")
    
    db.add_all([technical, logistics, marketing, finance])
    db.commit()

    # 2. Users (8 across all 5 roles)
    admin_user = User(
        email="admin@ordo.college",
        password_hash=hash_password(DEMO_PASSWORD),
        full_name="Dr. Alok Verma",
        role="super_admin",
        department_id=technical.id,
        phone="+919876543210"
    )
    coord_tech = User(
        email="rahul.coord@ordo.college",
        password_hash=hash_password(DEMO_PASSWORD),
        full_name="Rahul Sharma",
        role="coordinator",
        department_id=technical.id,
        phone="+919876543211"
    )
    coord_logistics = User(
        email="sneha.coord@ordo.college",
        password_hash=hash_password(DEMO_PASSWORD),
        full_name="Sneha Patil",
        role="coordinator",
        department_id=logistics.id,
        phone="+919876543212"
    )
    member_mkt = User(
        email="priya.mkt@ordo.college",
        password_hash=hash_password(DEMO_PASSWORD),
        full_name="Priya Nair",
        role="member",
        department_id=marketing.id,
        phone="+919876543213"
    )
    member_fin = User(
        email="rohit.fin@ordo.college",
        password_hash=hash_password(DEMO_PASSWORD),
        full_name="Rohit Kulkarni",
        role="member",
        department_id=finance.id,
        phone="+919876543214"
    )
    member_tech = User(
        email="amit.tech@ordo.college",
        password_hash=hash_password(DEMO_PASSWORD),
        full_name="Amit Desai",
        role="member",
        department_id=technical.id,
        phone="+919876543215"
    )
    approver_faculty = User(
        email="prof.mehta@ordo.college",
        password_hash=hash_password(DEMO_PASSWORD),
        full_name="Prof. R. Mehta",
        role="approver",
        department_id=finance.id,
        phone="+919876543216"
    )
    auditor_user = User(
        email="auditor@ordo.college",
        password_hash=hash_password(DEMO_PASSWORD),
        full_name="Sunil Joshi",
        role="auditor",
        department_id=finance.id,
        phone="+919876543217"
    )

    db.add_all([
        admin_user, coord_tech, coord_logistics, member_mkt,
        member_fin, member_tech, approver_faculty, auditor_user
    ])
    db.commit()

    # 3. College Event: "Tech Fest 2026"
    event = Event(
        name="Tech Fest 2026",
        description="Annual National Inter-Collegiate Engineering Symposium and Hackathon.",
        type="Symposium & Hackathon",
        start_datetime=now + timedelta(days=14),
        end_datetime=now + timedelta(days=16),
        venue="Main Auditorium Complex & CS Labs",
        expected_attendance=1500,
        budget_estimate=350000.0,
        status="active",
        created_by=admin_user.id
    )
    db.add(event)
    db.commit()

    # Team members
    db.add_all([
        EventParticipant(event_id=event.id, user_id=coord_tech.id, role_in_event="lead_coordinator"),
        EventParticipant(event_id=event.id, user_id=coord_logistics.id, role_in_event="logistics_coordinator"),
        EventParticipant(event_id=event.id, user_id=member_mkt.id, role_in_event="marketing_lead"),
        EventParticipant(event_id=event.id, user_id=approver_faculty.id, role_in_event="faculty_advisor")
    ])
    db.commit()

    # 4. 15 Tasks across departments with specified states:
    # 2 overdue, 2 blocked, 2 completed pending evidence, verified complete, in_progress, not_started
    
    # Task 1: Auditorium Booking & Electrical Clearance (Prereq for Sound)
    t1 = Task(
        event_id=event.id,
        title="Auditorium Booking & Electrical Clearance",
        description="Obtain formal venue clearance from Campus Facilities manager.",
        department_id=logistics.id,
        owner_id=coord_logistics.id,
        deadline=now + timedelta(days=2),
        priority="critical",
        status="in_progress",
        progress_percentage=60,
        evidence_required=True
    )
    # Task 2: Main Stage Sound & Light Rigging (BLOCKED by Task 1)
    t2 = Task(
        event_id=event.id,
        title="Main Stage Sound & Light Rigging",
        description="Rig line-array speakers, stage spotlights, and DMX console.",
        department_id=technical.id,
        owner_id=member_tech.id,
        deadline=now + timedelta(days=4),
        priority="high",
        status="blocked",
        blocked_reason="Blocked by incomplete prerequisite(s): Auditorium Booking & Electrical Clearance",
        progress_percentage=10,
        evidence_required=True
    )
    # Task 3: Generator Fuel & Backup UPS Installation (BLOCKED by Task 2)
    t3 = Task(
        event_id=event.id,
        title="Generator Fuel & Backup UPS Installation",
        description="Install 60kVA backup silent generator and test auto-cutover.",
        department_id=technical.id,
        owner_id=member_tech.id,
        deadline=now + timedelta(days=5),
        priority="high",
        status="blocked",
        blocked_reason="Blocked by incomplete prerequisite(s): Main Stage Sound & Light Rigging",
        progress_percentage=0,
        evidence_required=True
    )
    # Task 4: Sponsor Brochure Printing (OVERDUE by 2 days)
    t4 = Task(
        event_id=event.id,
        title="Sponsor Brochure Printing & Distribution",
        description="Print 200 copies of sponsor brochure and deliver to marketing desks.",
        department_id=marketing.id,
        owner_id=member_mkt.id,
        deadline=now - timedelta(days=2), # OVERDUE
        priority="critical",
        status="in_progress",
        progress_percentage=40,
        evidence_required=True
    )
    # Task 5: Budget Advance Requisition (OVERDUE by 1 day)
    t5 = Task(
        event_id=event.id,
        title="Budget Advance Requisition",
        description="Submit initial ₹50,000 cash advance voucher to Accounts.",
        department_id=finance.id,
        owner_id=member_fin.id,
        deadline=now - timedelta(days=1), # OVERDUE
        priority="high",
        status="in_progress",
        progress_percentage=50,
        evidence_required=True
    )
    # Task 6: Guest Speaker Travel & Hotel Booking (COMPLETED PENDING EVIDENCE)
    t6 = Task(
        event_id=event.id,
        title="Guest Speaker Travel & Hotel Booking",
        description="Book flight tickets and 2 nights hotel stay for keynote speaker.",
        department_id=logistics.id,
        owner_id=coord_logistics.id,
        deadline=now + timedelta(days=6),
        priority="medium",
        status="completed_pending_evidence",
        progress_percentage=90,
        evidence_required=True
    )
    # Task 7: Campus Wi-Fi & LAN Cabling for Hackathon (COMPLETED PENDING EVIDENCE)
    t7 = Task(
        event_id=event.id,
        title="Campus Wi-Fi & High-Speed LAN Cabling",
        description="Deploy dedicated 1Gbps fiber drop and switches across CS labs.",
        department_id=technical.id,
        owner_id=member_tech.id,
        deadline=now + timedelta(days=7),
        priority="high",
        status="completed_pending_evidence",
        progress_percentage=95,
        evidence_required=True
    )
    # Task 8: Principal Approval for Inter-College Fest (VERIFIED COMPLETE)
    t8 = Task(
        event_id=event.id,
        title="Principal Approval for Inter-College Fest",
        description="Formal sign-off letter from Principal for hosting dates.",
        department_id=logistics.id,
        owner_id=admin_user.id,
        deadline=now - timedelta(days=5),
        priority="critical",
        status="verified_complete",
        progress_percentage=100,
        evidence_required=True
    )
    # Task 9: Design & Publish Official Website (VERIFIED COMPLETE)
    t9 = Task(
        event_id=event.id,
        title="Design & Publish Official Website",
        description="Launch portal with registration payment gateway integration.",
        department_id=marketing.id,
        owner_id=member_mkt.id,
        deadline=now - timedelta(days=3),
        priority="high",
        status="verified_complete",
        progress_percentage=100,
        evidence_required=True
    )
    # Task 10: Catering & Lunch Voucher Quotations
    t10 = Task(
        event_id=event.id,
        title="Catering & Lunch Voucher Quotations",
        description="Collect bids from 3 authorized college campus caterers.",
        department_id=logistics.id,
        owner_id=coord_logistics.id,
        deadline=now + timedelta(days=3),
        priority="medium",
        status="in_progress",
        progress_percentage=30,
        evidence_required=True
    )
    # Task 11: Security & Gate Pass Protocol
    t11 = Task(
        event_id=event.id,
        title="Security & Gate Pass Protocol",
        description="Submit list of expected external vehicles and visitors to Security.",
        department_id=logistics.id,
        owner_id=coord_logistics.id,
        deadline=now + timedelta(days=8),
        priority="low",
        status="not_started",
        progress_percentage=0,
        evidence_required=False
    )
    # Task 12: T-Shirts & Kit Procurement
    t12 = Task(
        event_id=event.id,
        title="T-Shirts & Participant Kit Procurement",
        description="Order 500 volunteer T-shirts and lanyards.",
        department_id=marketing.id,
        owner_id=member_mkt.id,
        deadline=now + timedelta(days=4),
        priority="medium",
        status="in_progress",
        progress_percentage=25,
        evidence_required=True
    )
    # Task 13: Prize Money Allocation & Cheque Preparation
    t13 = Task(
        event_id=event.id,
        title="Prize Money Allocation & Cheque Preparation",
        description="Prepare ₹1,00,000 in hackathon cash award cheques.",
        department_id=finance.id,
        owner_id=member_fin.id,
        deadline=now + timedelta(days=10),
        priority="high",
        status="not_started",
        progress_percentage=0,
        evidence_required=True
    )
    # Task 14: Certificate Printing & Signature
    t14 = Task(
        event_id=event.id,
        title="Certificate Printing & Signature Run",
        description="Print 600 participation certificates and coordinate faculty signatures.",
        department_id=marketing.id,
        owner_id=member_mkt.id,
        deadline=now + timedelta(days=12),
        priority="low",
        status="not_started",
        progress_percentage=0,
        evidence_required=False
    )
    # Task 15: Post-Event Accounts Reconciliation
    t15 = Task(
        event_id=event.id,
        title="Post-Event Accounts Reconciliation",
        description="Collect all physical receipts and submit final audited report.",
        department_id=finance.id,
        owner_id=member_fin.id,
        deadline=now + timedelta(days=20),
        priority="medium",
        status="not_started",
        progress_percentage=0,
        evidence_required=True
    )

    all_tasks = [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13, t14, t15]
    db.add_all(all_tasks)
    db.commit()

    # 5. 6 Dependencies
    d1 = TaskDependency(task_id=t2.id, depends_on_task_id=t1.id, is_satisfied=False) # Sound depends on Venue
    d2 = TaskDependency(task_id=t3.id, depends_on_task_id=t2.id, is_satisfied=False) # Generator depends on Sound
    d3 = TaskDependency(task_id=t1.id, depends_on_task_id=t8.id, is_satisfied=True)  # Venue clearance depends on Principal Approval (satisfied)
    d4 = TaskDependency(task_id=t4.id, depends_on_task_id=t9.id, is_satisfied=True)  # Brochure depends on Website (satisfied)
    d5 = TaskDependency(task_id=t13.id, depends_on_task_id=t5.id, is_satisfied=False)# Cheques depend on Advance
    d6 = TaskDependency(task_id=t15.id, depends_on_task_id=t13.id, is_satisfied=False)# Reconciliation depends on Cheques

    db.add_all([d1, d2, d3, d4, d5, d6])
    db.commit()

    # 6. 8 Evidence Requirements
    ev1 = EvidenceRequirement(task_id=t1.id, name="Facilities Venue Booking Slip", mandatory=True, verification_status="pending")
    ev2 = EvidenceRequirement(task_id=t2.id, name="Audio Technician Sign-off Sheet", mandatory=True, verification_status="pending")
    ev3 = EvidenceRequirement(task_id=t4.id, name="Print Shop Spec Proof & Bill", mandatory=True, verification_status="pending")
    ev4 = EvidenceRequirement(task_id=t5.id, name="Approved Cash Advance Form", mandatory=True, verification_status="pending")
    ev5 = EvidenceRequirement(task_id=t6.id, name="Speaker Flight e-Ticket & Hotel Voucher", mandatory=True, verification_status="pending") # Uploaded, pending review
    ev6 = EvidenceRequirement(task_id=t7.id, name="Speedtest Benchmark Report (1Gbps)", mandatory=True, verification_status="pending") # Uploaded, pending review
    ev7 = EvidenceRequirement(task_id=t8.id, name="Principal Signed Letter with Seal", mandatory=True, verification_status="verified", verified_by=admin_user.id, verified_at=now)
    ev8 = EvidenceRequirement(task_id=t9.id, name="Live Domain URL & DNS Record", mandatory=True, verification_status="verified", verified_by=coord_tech.id, verified_at=now)

    db.add_all([ev1, ev2, ev3, ev4, ev5, ev6, ev7, ev8])
    db.commit()

    # 7. 3 External Contacts (one with WhatsApp opt-in, one without to demo opt-in rule)
    c1 = Contact(name="Vikram Audio Systems", email="info@vikramaudio.in", phone="+919811122233", organization="Vikram Audio Labs", notes="Stage contractor")
    c2 = Contact(name="Aura Printing House", email="press@auraprint.com", phone="+919822233344", organization="Aura Media Works", notes="Brochures & Badges")
    c3 = Contact(name="Dr. Sunita Raman (Keynote)", email="s.raman@techuniv.edu", phone="+919833344455", organization="Indian Institute of AI", notes="Chief Keynote Guest")

    db.add_all([c1, c2, c3])
    db.commit()

    # Opt-ins:
    # c1 has WhatsApp opt-in
    db.add(ContactChannel(contact_id=c1.id, channel="email", is_opted_in=True, opted_in_at=now, source="vendor_onboarding"))
    db.add(ContactChannel(contact_id=c1.id, channel="whatsapp", is_opted_in=True, opted_in_at=now, source="vendor_sms_consent"))
    # c2 has NO WhatsApp opt-in (Rule demo)
    db.add(ContactChannel(contact_id=c2.id, channel="email", is_opted_in=True, opted_in_at=now, source="vendor_onboarding"))
    db.add(ContactChannel(contact_id=c2.id, channel="whatsapp", is_opted_in=False, source="pending_opt_in"))
    # c3 has email only
    db.add(ContactChannel(contact_id=c3.id, channel="email", is_opted_in=True, opted_in_at=now, source="formal_invite"))

    # 8. 1 Event Template
    template = EventTemplate(
        name="Standard College Technical Symposium",
        description="Standard 15-task sequence covering technical, logistics, marketing, and finance milestones.",
        blueprint_json=json.dumps({
            "estimated_days": 21,
            "recommended_departments": ["Technical", "Logistics", "Marketing", "Finance"],
            "starter_task_count": 12
        })
    )
    db.add(template)

    # 9. 2 Pre-written communication drafts
    cd1 = CommunicationDraft(
        event_id=event.id,
        task_id=t4.id,
        recipient_email="press@auraprint.com",
        recipient_phone="+919822233344",
        channel="email",
        subject="URGENT: Tech Fest 2026 Brochure Printing Delivery Overdue",
        body="Dear Aura Printing House, Our brochure print delivery deadline was yesterday. Please expedite shipment today to prevent delay of sponsor distribution.",
        approval_status="draft"
    )
    cd2 = CommunicationDraft(
        event_id=event.id,
        task_id=t1.id,
        recipient_email="logistics@ordo.college",
        channel="email",
        subject="Action Required: Facilities Clearance for Main Auditorium",
        body="Please ensure the campus facilities clearance letter is signed by 5 PM today so stage rigging can commence.",
        approval_status="approved",
        approved_by=admin_user.id
    )
    db.add_all([cd1, cd2])

    # 10. 1 Sample minutes document ready for AI extraction
    minutes = AttachmentsTextCache(
        file_name="TechFest_Core_Committee_Minutes_Oct24.txt",
        file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        extracted_text="""TECH FEST 2026 - CORE COMMITTEE MEETING MINUTES
Date: October 24, 2026 | Location: Conference Room B
Attendees: Dr. Alok Verma, Rahul Sharma, Sneha Patil, Priya Nair, Rohit Kulkarni

Key Commitments:
1. Rahul Sharma (Technical) committed to completing the Sound and Light rigging by November 2 once the venue is clear.
2. Sneha Patil (Logistics) confirmed she will collect the signed Principal venue clearance letter by Wednesday.
3. Priya Nair (Marketing) agreed to print 500 promotional flyers as soon as the poster graphics are finalized.
4. Rohit Kulkarni (Finance) will disburse the initial advance of INR 50,000 by Friday once requisition is endorsed.
""",
        page_count=1
    )
    db.add(minutes)

    # 11. Feature flags
    f1 = FeatureFlag(key="global_kill_switch", name="Global Kill Switch", description="Pauses all outbound notifications and scheduled automation.", is_enabled=False)
    f2 = FeatureFlag(key="ordo_copilot", name="ORDO Copilot", description="Interactive natural language Q&A side panel.", is_enabled=True)
    f3 = FeatureFlag(key="smart_task_builder", name="Smart Task Builder", description="AI generated starter task lists.", is_enabled=True)
    db.add_all([f1, f2, f3])

    db.commit()

