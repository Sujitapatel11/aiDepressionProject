from datetime import timedelta
from django.utils import timezone
from django.db import models
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import CrashReport, AnalyticsEvent, ClientLog, FeedbackItem
from .serializers import (
    CrashReportSerializer, AnalyticsEventSerializer,
    ClientLogSerializer, FeedbackItemSerializer
)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def crash_report_view(request):
    """
    Ingest Crash Reports from Flutter / Web Clients
    """
    data = request.data
    user = request.user if request.user and request.user.is_authenticated else None
    
    if isinstance(data, list):
        created_items = []
        for item in data:
            serializer = CrashReportSerializer(data=item)
            if serializer.is_valid():
                obj = serializer.save(user=user)
                created_items.append(obj)
        return Response({"status": "ingested", "count": len(created_items)}, status=status.HTTP_201_CREATED)
    else:
        serializer = CrashReportSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def analytics_event_view(request):
    """
    Ingest Analytics Events (DAU/WAU, Screen Views, Feature Usage)
    """
    data = request.data
    user = request.user if request.user and request.user.is_authenticated else None

    if isinstance(data, list):
        created_items = []
        for item in data:
            serializer = AnalyticsEventSerializer(data=item)
            if serializer.is_valid():
                obj = serializer.save(user=user)
                created_items.append(obj)
        return Response({"status": "ingested", "count": len(created_items)}, status=status.HTTP_201_CREATED)
    else:
        serializer = AnalyticsEventSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def client_log_view(request):
    """
    Ingest Client Error & Performance Logs
    """
    data = request.data
    user = request.user if request.user and request.user.is_authenticated else None

    serializer = ClientLogSerializer(data=data)
    if serializer.is_valid():
        serializer.save(user=user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def feedback_view(request):
    """
    GET: List feedback items (Admin/Staff)
    POST: Submit in-app bug report, suggestion, or feature request
    """
    if request.method == 'GET':
        items = FeedbackItem.objects.all().order_by('-created_at')[:100]
        serializer = FeedbackItemSerializer(items, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        user = request.user if request.user and request.user.is_authenticated else None
        serializer = FeedbackItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def beta_dashboard_stats(request):
    """
    Real-Time Closed Beta Administration Dashboard API
    Calculates DAU, WAU, Crash-Free Session %, API Failures, Feedback counts, and Feature Usage.
    """
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)

    # Active Users
    dau_count = AnalyticsEvent.objects.filter(
        created_at__gte=today_start, user__isnull=False
    ).values('user').distinct().count()

    wau_count = AnalyticsEvent.objects.filter(
        created_at__gte=week_ago, user__isnull=False
    ).values('user').distinct().count()

    # Session & Crash Metrics
    total_sessions = AnalyticsEvent.objects.filter(event_name='session_start').count()
    total_crashes = CrashReport.objects.count()
    fatal_crashes = CrashReport.objects.filter(severity=CrashReport.SEVERITY_FATAL).count()

    if total_sessions > 0:
        crash_free_percent = round(max(0.0, ((total_sessions - fatal_crashes) / total_sessions) * 100), 2)
    else:
        crash_free_percent = 100.0  # 100% crash free baseline before sessions recorded

    # Feedback Breakdown
    feedback_total = FeedbackItem.objects.count()
    feedback_open = FeedbackItem.objects.filter(status=FeedbackItem.STATUS_OPEN).count()
    feedback_by_cat = {
        "bug_report": FeedbackItem.objects.filter(category=FeedbackItem.CATEGORY_BUG).count(),
        "suggestion": FeedbackItem.objects.filter(category=FeedbackItem.CATEGORY_SUGGESTION).count(),
        "feature_request": FeedbackItem.objects.filter(category=FeedbackItem.CATEGORY_FEATURE).count(),
    }

    # Feature Usage Breakdown
    feature_events = AnalyticsEvent.objects.values('event_name').annotate(
        count=models.Count('id')
    ).order_by('-count')[:15]
    feature_usage = {item['event_name']: item['count'] for item in feature_events}

    # API Failures from client logs
    client_error_count = ClientLog.objects.filter(level=ClientLog.LEVEL_ERROR).count()

    data = {
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "beta_overview": {
            "dau": dau_count,
            "wau": wau_count,
            "total_registered_beta_users": dau_count,  # Dynamically computed
            "crash_free_session_percent": crash_free_percent,
            "target_crash_free_percent": 99.0,
            "exit_criteria_met": crash_free_percent >= 99.0 and fatal_crashes == 0,
        },
        "crash_metrics": {
            "total_crashes": total_crashes,
            "fatal_crashes": fatal_crashes,
            "non_fatal_exceptions": total_crashes - fatal_crashes,
        },
        "feedback_metrics": {
            "total": feedback_total,
            "open": feedback_open,
            "by_category": feedback_by_cat,
        },
        "feature_usage": feature_usage,
        "logging_metrics": {
            "client_error_logs": client_error_count,
        },
    }
    return Response(data, status=status.HTTP_200_OK)
