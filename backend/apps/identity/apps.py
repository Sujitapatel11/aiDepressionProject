from django.apps import AppConfig


class IdentityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.identity'
    verbose_name = 'Soul Identity'

    def ready(self):
        # Bootstrap provider registry when Django starts
        try:
            from .services.registry import bootstrap_providers
            bootstrap_providers()
        except ImportError:
            pass
