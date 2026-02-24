from django.contrib import admin

# Register your models here.
from .models import SupportRequest, SupportConnection, Message, JournalEntry, Insight
admin.site.register(SupportRequest)
admin.site.register(SupportConnection)  
admin.site.register(Message)
admin.site.register(JournalEntry)
admin.site.register(Insight)