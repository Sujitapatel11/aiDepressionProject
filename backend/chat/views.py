from urllib import request
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.views.decorators.http import require_POST
from django.db.models import Q

#from backend.chat.ai.signal_extractor import extract_signals_from_journal
from .models import JournalEntry
from.models import Insight
from .insight_engine import generate_insights_for_user
from chat.ai.signal_extractor import extract_signals_from_journal
from chat.ai.insight_builder import generate_insights_for_user


from .models import SupportRequest, SupportConnection, Message
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from chat.ai.signal_extractor import extract_signals_from_journal
from chat.ai.rule_insight_engine import generate_rule_based_insight_text

# =========================
# AUTH
# =========================

def login_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect("dashboard")

        return render(request, "chat/login.html", {"error": "Invalid credentials"})

    return render(request, "chat/login.html")


@login_required
def logout_view(request):
    logout(request)
    return redirect("chat/login")
def signup_view(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        confirm_password = request.POST.get("confirm_password")

        if password != confirm_password:
            return render(request, "chat/signup.html", {"error": "Passwords do not match"})

        if User.objects.filter(username=username).exists():
            return render(request, "chat/signup.html", {"error": "Username already taken"})

        user = User.objects.create_user(username=username, password=password)
        login(request, user)
        return redirect("dashboard")

    return render(request, "chat/signup.html")


# =========================
# DASHBOARD
# =========================

@login_required
def dashboard_view(request):
    user = request.user

    # =========================
    # SUPPORT REQUESTS
    # =========================
    incoming_requests_qs = SupportRequest.objects.filter(
        to_user=user,
        status='pending'
    )
    incoming_requests_count = incoming_requests_qs.count()

    # =========================
    # ACTIVE CONNECTIONS
    # =========================
    connections_qs = SupportConnection.objects.filter(
        Q(user_one=user) | Q(user_two=user),
        status='active'
    )
    connections_count = connections_qs.count()

    # =========================
    # AVAILABLE USERS
    # =========================
    connected_user_ids = {
        c.user_one_id if c.user_one_id != user.id else c.user_two_id
        for c in connections_qs
    }

    available_users = User.objects.exclude(
        id=user.id
    ).exclude(
        id__in=connected_user_ids
    )

    # =========================
    # JOURNALING (CORE)
    # =========================
    journal_qs = JournalEntry.objects.filter(
        user=user,
        is_deleted=False
    )

    journal_count = journal_qs.count()
    latest_journal = journal_qs.order_by('-created_at').first()

    # =========================
    # PLACEHOLDERS (SAFE)
    # =========================
    pending_insights = 0
    active_tasks = 0
    stories_count = 0

    # =========================
    # CONTEXT
    # =========================
    context = {
        "incoming_requests": incoming_requests_count,
        "connections": connections_count,
        "available_users": available_users,

        "journal_count": journal_count,
        "latest_journal": latest_journal,

        "pending_insights": pending_insights,
        "active_tasks": active_tasks,
        "stories_count": stories_count,
       
    }
  
    return render(request, "chat/dashboard.html", {
    #"requests": incoming_requests,
    #"connections": connections,
    #"users": users,
    "journal_count": journal_count,
    "latest_journal": latest_journal,

})

@login_required
def journal_create_view(request):
    if request.method == "GET":
        return render(request, "chat/journal_create.html")

    if request.method == "POST":
        content = request.POST.get("content", "").strip()

        if not content:
            return render(
                request,
                "chat/journal_create.html",
                {"error": "Journal cannot be empty."}
            )

        # ✅ CORE: JOURNAL SAVE (ABSOLUTELY SAFE)
        journal = JournalEntry.objects.create(
            user=request.user,
            content=content,
            created_at=timezone.now(),
        )

        # ✅ OPTIONAL: INSIGHT (FAIL-SAFE)
        try:
            from chat.ai.rule_insight_engine import generate_rule_based_insight_text
            from chat.models import Insight

            insight_text = generate_rule_based_insight_text(journal.content)

            Insight.objects.create(
                user=request.user,
                journal=journal,
                title="Reflection",
                message=insight_text,
                source_window_start=journal.created_at,
                source_window_end=journal.created_at,
            )

        except Exception as e:
            # NEVER break journal
            print("Insight skipped:", e)

        return redirect("dashboard")

    return redirect("dashboard")
    return redirect("dashboard")
@login_required
def journal_list_view(request):
    journals = JournalEntry.objects.filter(
        user=request.user,
        is_deleted=False
    )

    return render(request, "chat/journal_list.html", {
        "journals": journals
    })


@login_required
def journal_delete_view(request, journal_id):
    journal = JournalEntry.objects.filter(
        id=journal_id,
        user=request.user
    ).first()

    if journal:
        journal.is_deleted = True
        journal.save()

    return redirect("journal_list")
def generate_insights_from_existing_journals(user):
    from .models import JournalEntry, Insight

    journals = JournalEntry.objects.filter(
        user=user,
        is_deleted=False
    ).order_by("created_at")

    if not journals.exists():
        return

    journal_count = journals.count()

    window_start = journals.first().created_at
    window_end = journals.last().created_at

    # Insight 1: Consistency
    if journal_count >= 2:
        Insight.objects.get_or_create(
            user=user,
            title="You’ve been reflecting consistently",
            source_window_start=window_start,
            source_window_end=window_end,
            defaults={
                "message": (
                    "You’ve written multiple journal entries. "
                    "Consistency in reflection can help build awareness over time."
                )
            }
        )

    # Insight 2: Recent reflection
    latest = journals.last()
    Insight.objects.get_or_create(
        user=user,
        title="A recent reflection stands out",
        source_window_start=latest.created_at,
        source_window_end=latest.created_at,
        defaults={
            "message": (
                f"You shared a thought on {latest.created_at.strftime('%B %d')}. "
                "Noticing patterns over time can be grounding."
            )
        }
    )
@login_required
def insights_view(request):
    # Backfill insights ONLY if none exist yet
    has_any_insights = Insight.objects.filter(
        user=request.user
    ).exists()

    if not has_any_insights:
        generate_insights_from_existing_journals(request.user)

    insights = Insight.objects.filter(
        user=request.user,
        is_dismissed=False
    ).order_by("-created_at")

    return render(request, "chat/insights.html", {
        "insights": insights
    })
@login_required
def insight_detail_view(request, insight_id):
    """
    Allows user to dismiss an insight.
    """
    insight = get_object_or_404(
        Insight,
        id=insight_id,
        user=request.user
    )

    insight.is_dismissed = True
    insight.save(update_fields=["is_dismissed"])

    return redirect("insights")
# =========================
# SUPPORT REQUESTS
# =========================

@login_required
def send_support_request(request, user_id):
    to_user = get_object_or_404(User, id=user_id)

    if to_user == request.user:
        return redirect("dashboard")

    SupportRequest.objects.get_or_create(
        from_user=request.user,
        to_user=to_user,
        defaults={"status": "pending"}
    )

    return redirect("dashboard")


@login_required
def accept_support_request(request, request_id):
    req = get_object_or_404(
        SupportRequest,
        id=request_id,
        to_user=request.user
    )

    req.is_accepted = True
    req.save()

    SupportConnection.objects.get_or_create(
        user_one=min(req.from_user, req.to_user, key=lambda u: u.id),
        user_two=max(req.from_user, req.to_user, key=lambda u: u.id),
    )

    return redirect("dashboard")


@login_required
def reject_support_request(request, request_id):
    req = get_object_or_404(
        SupportRequest,
        id=request_id,
        to_user=request.user
    )
    req.delete()
    return redirect("dashboard")


# =========================
# CHAT (HTTP ONLY)
# =========================

@login_required
def chat_view(request, user_id):
    other_user = get_object_or_404(User, id=user_id)

    connected = SupportConnection.objects.filter(
        Q(user_one=request.user, user_two=other_user) |
        Q(user_one=other_user, user_two=request.user),
        is_active=True
    ).exists()

    if not connected:
        return redirect("dashboard")

    if request.method == "POST":
        content = request.POST.get("message", "").strip()
        if content:
            Message.objects.create(
                sender=request.user,
                receiver=other_user,
                content=content
            )
        return redirect("chat", user_id=other_user.id)

    messages = Message.objects.filter(
        Q(sender=request.user, receiver=other_user) |
        Q(sender=other_user, receiver=request.user)
    ).order_by("created_at")

    return render(request, "chat.html", {
        "messages": messages,
        "other": other_user
    })
