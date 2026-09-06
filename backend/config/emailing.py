import logging

import requests
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_transactional_email(subject, text_content, recipient_email, recipient_name=None, html_content=None):
    """Send a transactional email via Brevo's HTTP API, falling back to
    Django's configured EMAIL_BACKEND if Brevo isn't configured or fails.

    Previously this logic (Brevo call + fallback) was independently
    duplicated in accounts.tasks and monitoring.tasks and had already
    drifted (different exception handling, one supported HTML the other
    didn't) - this is now the single implementation both use.
    """
    brevo_key = getattr(settings, "BREVO_API_KEY", None)
    brevo_email = getattr(settings, "BREVO_SENDER_EMAIL", None)
    brevo_name = getattr(settings, "BREVO_SENDER_NAME", "PingBEAT")
    from_email = brevo_email or getattr(settings, "DEFAULT_FROM_EMAIL", "alerts@pingbeat.com")

    if brevo_key and brevo_email:
        payload = {
            "sender": {"name": brevo_name, "email": brevo_email},
            "to": [{"email": recipient_email, "name": recipient_name or recipient_email}],
            "subject": subject,
            "textContent": text_content,
        }
        if html_content:
            payload["htmlContent"] = html_content
        try:
            response = requests.post(
                BREVO_API_URL,
                json=payload,
                headers={
                    "accept": "application/json",
                    "content-type": "application/json",
                    "api-key": brevo_key,
                },
                timeout=10,
            )
            if response.status_code in (200, 201, 202):
                return f"Email sent to {recipient_email} via Brevo API."
            logger.warning(
                "Brevo email failed for %s: %s %s",
                recipient_email, response.status_code, response.text,
            )
        except requests.RequestException:
            logger.warning("Brevo email request failed for %s", recipient_email, exc_info=True)

    send_mail(
        subject=subject,
        message=text_content,
        from_email=from_email,
        recipient_list=[recipient_email],
        fail_silently=False,
        html_message=html_content,
    )
    return f"Email sent to {recipient_email} via Django email backend."
