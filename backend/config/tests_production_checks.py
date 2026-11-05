"""Tests for production configuration validation (config/production_checks).

These are pure-function tests: they never read the real deployment
environment, never contact R2, and never log or assert on credential values.
"""

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, override_settings

from config.production_checks import (
    DEFAULT_DEV_SECRET_KEY,
    env_flag,
    validate_media_storage,
    validate_production_security,
)


class EnvFlagTests(SimpleTestCase):
    def test_recognises_truthy_values_only(self):
        for value in ('1', 'true', 'TRUE', 'yes', 'on', ' On '):
            self.assertTrue(env_flag(value), value)
        for value in ('', None, '0', 'false', 'no', 'off', 'maybe'):
            self.assertFalse(env_flag(value), value)


class MediaStorageValidationTests(SimpleTestCase):
    """Production must never silently fall back to ephemeral local storage."""

    def test_development_is_exempt(self):
        validate_media_storage(
            debug=True, running_tests=False, r2_configured=False, r2_partial=False,
            allow_local_storage=False, media_root='/tmp/media',
        )

    def test_test_suite_is_exempt(self):
        validate_media_storage(
            debug=False, running_tests=True, r2_configured=False, r2_partial=False,
            allow_local_storage=False, media_root='/tmp/media',
        )

    def test_fully_configured_r2_passes(self):
        validate_media_storage(
            debug=False, running_tests=False, r2_configured=True, r2_partial=True,
            allow_local_storage=False, media_root='/tmp/media',
        )

    def test_production_without_storage_fails_fast(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_media_storage(
                debug=False, running_tests=False, r2_configured=False, r2_partial=False,
                allow_local_storage=False, media_root='/srv/app/media',
            )
        message = str(ctx.exception)
        self.assertIn('Cloudinary nor Cloudflare R2', message)
        self.assertIn('CLOUDINARY_CLOUD_NAME', message)
        self.assertIn('/srv/app/media', message)
        self.assertIn('SOULCARE_ALLOW_LOCAL_MEDIA_STORAGE', message)

    def test_partially_configured_r2_is_rejected_in_production(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_media_storage(
                debug=False, running_tests=False, r2_configured=False, r2_partial=True,
                allow_local_storage=False, media_root='/srv/app/media',
            )
        self.assertIn('partially configured', str(ctx.exception))

    def test_partial_config_stays_rejected_even_with_local_opt_in(self):
        with self.assertRaises(ImproperlyConfigured):
            validate_media_storage(
                debug=False, running_tests=False, r2_configured=False, r2_partial=True,
                allow_local_storage=True, media_root='/srv/app/media',
            )

    def test_explicit_local_opt_in_is_accepted(self):
        validate_media_storage(
            debug=False, running_tests=False, r2_configured=False, r2_partial=False,
            allow_local_storage=True, media_root='/mnt/persistent/media',
        )


class ProductionSecurityValidationTests(SimpleTestCase):
    def _valid(self, **overrides):
        kwargs = dict(
            debug=False,
            running_tests=False,
            secret_key='x' * 64,
            allowed_hosts=['api.soulcare.app', 'aidepressionproject.onrender.com'],
            cors_allow_all_origins=False,
            redis_url='redis://cache.internal:6379/0',
            allow_in_memory_channels=False,
            db_engine='django.db.backends.postgresql',
            db_password='real-not-default',
        )
        kwargs.update(overrides)
        return kwargs

    def test_valid_production_configuration_passes(self):
        validate_production_security(**self._valid())

    def test_development_and_tests_are_exempt(self):
        validate_production_security(**self._valid(debug=True, secret_key='', allowed_hosts=[],
                                                   redis_url='', db_engine='sqlite'))
        validate_production_security(**self._valid(running_tests=True, secret_key='',
                                                   allowed_hosts=[], redis_url='',
                                                   db_engine='sqlite'))

    def test_missing_secret_key_is_rejected(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_production_security(**self._valid(secret_key=''))
        self.assertIn('SECRET_KEY', str(ctx.exception))

    def test_development_secret_placeholder_is_rejected(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_production_security(**self._valid(secret_key=DEFAULT_DEV_SECRET_KEY))
        self.assertIn('development placeholder', str(ctx.exception))

    def test_empty_allowed_hosts_is_rejected(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_production_security(**self._valid(allowed_hosts=[]))
        self.assertIn('ALLOWED_HOSTS', str(ctx.exception))

    def test_wildcard_allowed_hosts_is_rejected(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_production_security(**self._valid(allowed_hosts=['*']))
        self.assertIn('ALLOWED_HOSTS', str(ctx.exception))

    def test_cors_wildcard_is_rejected(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_production_security(**self._valid(cors_allow_all_origins=True))
        self.assertIn('CORS_ALLOW_ALL_ORIGINS', str(ctx.exception))

    def test_missing_redis_is_rejected_unless_explicitly_allowed(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_production_security(**self._valid(redis_url=''))
        self.assertIn('REDIS_URL', str(ctx.exception))
        validate_production_security(**self._valid(redis_url='', allow_in_memory_channels=True))

    def test_sqlite_production_database_is_rejected(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_production_security(
                **self._valid(db_engine='django.db.backends.sqlite3'))
        self.assertIn('SQLite', str(ctx.exception))

    def test_default_postgres_password_is_rejected(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_production_security(**self._valid(db_password='postgres'))
        self.assertIn('default development value', str(ctx.exception))

    def test_all_problems_are_reported_together(self):
        with self.assertRaises(ImproperlyConfigured) as ctx:
            validate_production_security(**self._valid(
                secret_key='', allowed_hosts=[], cors_allow_all_origins=True,
                redis_url='', db_engine='django.db.backends.sqlite3'))
        message = str(ctx.exception)
        for expected in ('SECRET_KEY', 'ALLOWED_HOSTS', 'CORS_ALLOW_ALL_ORIGINS',
                         'REDIS_URL', 'SQLite'):
            self.assertIn(expected, message)


class MediahubStorageConfigTests(SimpleTestCase):
    """r2_config/r2_enabled must reflect settings and never raise on partial env."""

    def test_r2_disabled_when_nothing_configured(self):
        from apps.mediahub.storage import r2_enabled
        with override_settings(R2_ACCOUNT_ID='', R2_ACCESS_KEY_ID='',
                               R2_SECRET_ACCESS_KEY='', R2_BUCKET_NAME=''):
            self.assertFalse(r2_enabled())

    def test_r2_disabled_on_partial_configuration(self):
        from apps.mediahub.storage import r2_enabled
        with override_settings(R2_ACCOUNT_ID='acct', R2_ACCESS_KEY_ID='key',
                               R2_SECRET_ACCESS_KEY='', R2_BUCKET_NAME='bucket'):
            self.assertFalse(r2_enabled())

    def test_r2_enabled_only_with_all_four_values(self):
        from apps.mediahub.storage import r2_enabled
        with override_settings(R2_ACCOUNT_ID='acct', R2_ACCESS_KEY_ID='key',
                               R2_SECRET_ACCESS_KEY='secret', R2_BUCKET_NAME='bucket'):
            self.assertTrue(r2_enabled())

    def test_endpoint_is_derived_from_account_id(self):
        from apps.mediahub.storage import r2_config
        with override_settings(R2_ACCOUNT_ID='acct', R2_ENDPOINT_URL=''):
            self.assertEqual(r2_config()['endpoint'],
                             'https://acct.r2.cloudflarestorage.com')

    def test_explicit_endpoint_overrides_derivation(self):
        from apps.mediahub.storage import r2_config
        with override_settings(R2_ACCOUNT_ID='acct',
                               R2_ENDPOINT_URL='https://custom.example.com'):
            self.assertEqual(r2_config()['endpoint'], 'https://custom.example.com')

    def test_local_storage_backend_under_test(self):
        # settings.py sets STORAGES at startup using _IS_RUNNING_TESTS, which
        # is True whenever sys.argv contains 'test'. This guarantees
        # FileSystemStorage is used regardless of R2 environment variables,
        # so the test suite never touches a live bucket.
        # The assertion uses the live settings value, which is the one that
        # was actually active when Django started this test run.
        from django.conf import settings
        self.assertIn(
            'FileSystemStorage',
            settings.STORAGES['default']['BACKEND'],
            'Tests must always use FileSystemStorage — check _IS_RUNNING_TESTS in settings.py',
        )
