import os
from django.shortcuts import render


def index(request):
    return render(request, 'web/index.html')


def login_view(request):
    google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    return render(request, 'web/login.html', {'google_client_id': google_client_id})


def beta_admin(request):
    return render(request, 'web/beta_admin.html')


