import copy
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core import mail
import django.template.context

# Fix Python 3.14 stdlib copy(super()) incompatibility in Django 4.2 BaseContext.__copy__
def _patch_base_context_copy(self):
    duplicate = self.__class__.__new__(self.__class__)
    duplicate.dicts = self.dicts[:]
    return duplicate

django.template.context.BaseContext.__copy__ = _patch_base_context_copy

User = get_user_model()


class PasswordResetEmailTemplatesTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="oldpassword123",
            first_name="Jane",
            last_name="Doe",
        )

    def test_password_reset_email_sends_html_and_text_with_branding(self):
        """Verify password_reset_view sends multipart email with branded HTML, text, subject, and SoulCare sender name."""
        response = self.client.post("/api/auth/password/reset/", {"email": "testuser@example.com"})
        self.assertEqual(response.status_code, 200)

        # Check mail inbox
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]

        # Verify Subject line
        self.assertEqual(sent_email.subject.strip(), "Reset your SoulCare password")

        # Verify Sender display name
        self.assertIn("SoulCare", sent_email.from_email)

        # Verify Plain text content
        self.assertIn("Hello Jane Doe", sent_email.body)
        self.assertIn("SoulCare", sent_email.body)
        self.assertIn("UID:", sent_email.body)
        self.assertIn("Reset Token:", sent_email.body)

        # Verify HTML content attachment
        self.assertEqual(len(sent_email.alternatives), 1)
        html_content, mimetype = sent_email.alternatives[0]
        self.assertEqual(mimetype, "text/html")
        self.assertIn("Reset Your Password", html_content)
        self.assertIn("SoulCare", html_content)
        self.assertIn("#7C3AED", html_content)  # Primary purple brand color
        self.assertIn("EMOTIONAL WELLNESS COMPANION", html_content)
        self.assertIn("Reset Password &rarr;", html_content)
