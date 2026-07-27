from django.shortcuts import render


def index(request):
    return render(request, 'web/index.html')


def login_view(request):
    return render(request, 'web/login.html')


def beta_admin(request):
    return render(request, 'web/beta_admin.html')


