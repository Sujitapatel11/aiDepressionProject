import os
import sys
import django

# Setup django environment
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.core.mail import send_mail
from django.conf import settings

print("=== SMTP Configuration ===")
print("EMAIL_BACKEND:", settings.EMAIL_BACKEND)
print("EMAIL_HOST:", settings.EMAIL_HOST)
print("EMAIL_PORT:", settings.EMAIL_PORT)
print("EMAIL_USE_TLS:", settings.EMAIL_USE_TLS)
print("EMAIL_HOST_USER:", settings.EMAIL_HOST_USER)
print("DEFAULT_FROM_EMAIL:", settings.DEFAULT_FROM_EMAIL)
print("EMAIL_HOST_PASSWORD length:", len(settings.EMAIL_HOST_PASSWORD))
print("==========================")

recipient = "sujitapatel786@gmail.com"
print(f"Attempting to send test email to {recipient}...")

try:
    result = send_mail(
        subject="SoulCare SMTP Test",
        message="This is a test email from SoulCare password reset SMTP test script.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient],
        fail_silently=False,
    )
    print("SUCCESS: send_mail returned:", result)
except Exception as e:
    print("FAILURE: send_mail raised an exception!")
    import traceback
    traceback.print_exc()
