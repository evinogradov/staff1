# coding: utf-8
from django import forms
from django.contrib.auth.models import User, Group
from . import DINNER_DELEGATE_GROUP
import models as m

class DelegatedOrderForm(forms.Form):
    user = forms.ModelChoiceField(User.objects.filter(
        groups = Group.objects.get(pk=DINNER_DELEGATE_GROUP)),
        required=False,
        empty_label=u'себе',
        label=u'Кому заказать',
    )

class MenuForm(forms.ModelForm):
    class Meta:
        model = m.Menu
        fields = ('source',)
