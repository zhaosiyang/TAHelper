#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import webapp2
import os
import re
import jinja2
from google.appengine.ext import db
import random
import hashlib
import string
import urllib2
from xml.dom import minidom
import json
import logging
import time
import datetime

template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_env = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir), autoescape=True)

def openFile(documentSource):
	fr = open(documentSource, 'r')
	text = fr.read()
	fr.close()
	return text
class Handler(webapp2.RequestHandler):
	def write(self, *a, **kw):
		self.response.write(*a, **kw)
	def render_str(self, template, **params):
		t = jinja_env.get_template(template)
		return t.render(params)
	def render(self, template, **kw):
		self.write(self.render_str(template, **kw))
class sessionDB(db.Model):
	sessionID = db.StringProperty(required = True)
	duration = db.IntegerProperty(required = True)
	active = db.BooleanProperty(required = True)
	startTime = db.DateTimeProperty(required = True)
	endTime = db.DateTimeProperty(required = True)
	location = db.StringProperty()
class queueDB(db.Model):
	sessionID = db.StringProperty(required = True)
	queueType = db.IntegerProperty(required = True)
	personID = db.StringProperty(required = True)
	myNumber = db.IntegerProperty(required = True)
	active = db.BooleanProperty(required = True)
class MainHandler(Handler):
	def get(self):
		entries = db.GqlQuery("SELECT * FROM sessionDB WHERE active=:1 ORDER BY startTime DESC", True)
		self.render("index.html", entries = entries)
class AjaxSessionDB(Handler):
	timeZoneAjustment = datetime.timedelta(seconds = -3600 * 5)
	def get(self):
		entries = db.GqlQuery("SELECT * FROM sessionDB WHERE active=:1 ORDER BY startTime DESC", True)
		self.render("sessionTable.html", entries = entries)
	def post(self):
		sessionID = self.request.get("sessionID")
		duration = int(self.request.get("duration"))
		location = self.request.get("location")
		if db.GqlQuery("SELECT * FROM sessionDB WHERE sessionID=:1 AND active=True", sessionID).count():
			self.write("Fail")
		else:
			startTime = datetime.datetime.now()
			delta = datetime.timedelta(seconds=3600*duration)
			endTime = startTime + delta
			sessionDB(sessionID=sessionID, startTime=startTime+self.timeZoneAjustment ,duration=duration, endTime=endTime+self.timeZoneAjustment ,active=True, location=location).put()
			self.write("Success")
class DeleteSession(Handler):
	timeZoneAjustment = datetime.timedelta(seconds = -3600 * 5)
	def get(self):
		sessionEntries = sessionDB.all()
		for sessionEntry in sessionEntries:
			if sessionEntry.endTime < datetime.datetime.now() + self.timeZoneAjustment and sessionEntry.active:
				sessionEntry.active = False
				sessionEntry.put()
				queueEntries = db.GqlQuery("SELECT * FROM queueDB WHERE sessionID=:1", sessionEntry.sessionID)
				for queueEntry in queueEntries:
					queueEntry.active = False
					queueEntry.put()
class TAmainPage(Handler):
	def get(self):
		entries = db.GqlQuery("SELECT * FROM sessionDB WHERE active=:1 ORDER BY startTime DESC", True)
		self.render("TAmainPage.html", entries = entries)
class TAworkingPage(Handler):
	def get(self):
		sessionID = self.request.get("sessionID")
		self.render("TAworkingPage.html", sessionID = sessionID)
class StudentWorkingPage(Handler):
	def get(self):
		sessionID = self.request.get("sessionID")
		self.render("studentWorkingPage.html", sessionID = sessionID)
class Queue(Handler):
	def get(self):
		myNumber = int(self.request.get("myNumber"))
		command = self.request.get("command")
		queueType = int(self.request.get("queueType"))
		sessionID = self.request.get("sessionID")
		if command == "getAheadNumber":
			numberAhead = db.GqlQuery("SELECT * FROM queueDB WHERE queueType=:1 AND myNumber<:2 AND active=:3 AND sessionID=:4", queueType, myNumber, True, sessionID).count()
			self.write(numberAhead)
		elif command == "dequeue":
			entry = db.GqlQuery("SELECT * FROM queueDB WHERE myNumber=:1 AND queueType=:2 AND sessionID=:3", myNumber, queueType, sessionID).get()
			entry.active = False
			entry.put() 
		elif command == "getQueue":
			# entries = queueDB.all()
			# entries.filter("sessionID=", sessionID)
			# entries.filter("queueType=", queueType)
			# entries.filter("active=", True)
			entries = db.GqlQuery("SELECT * FROM queueDB WHERE queueType=:1 AND sessionID=:2 AND active=:3 ORDER BY myNumber", queueType, sessionID, True)
			# entries.order("myNumber")
			self.render("queuePage.html", entries = entries)
		else:
			pass
	def post(self):
		queueType = int(self.request.get("queueType"))
		sessionID = self.request.get("sessionID")
		personID = self.request.get("personID")
		cursor = db.GqlQuery("SELECT * FROM queueDB WHERE queueType=:1 AND sessionID=:2 ORDER BY myNumber DESC", queueType, sessionID)
		if cursor.count()==0:
			myNumber = 1
			queueDB(sessionID=sessionID, queueType=queueType, personID=personID, myNumber=myNumber, active=True).put()
			self.write("1|0")
		else:
			myNumber = cursor.get().myNumber + 1
			numberAhead = db.GqlQuery("SELECT * FROM queueDB WHERE queueType=:1 AND active=:2 AND sessionID=:3", queueType, True, sessionID).count()
			queueDB(sessionID=sessionID, queueType=queueType, personID=personID, myNumber=myNumber, active=True).put()
			self.write(str(myNumber)+"|"+str(numberAhead)) 

app = webapp2.WSGIApplication([
    ('/', MainHandler),
    ('/TAmainPage', TAmainPage),
    ('/TAworkingPage', TAworkingPage),
    ('/studentWorkingPage', StudentWorkingPage),
    ('/studentWorkingPage', StudentWorkingPage),
    ('/queue', Queue),
    ('/AjaxSessionDB', AjaxSessionDB),
    ('/deleteSession', DeleteSession),
    ('/deleteSession', DeleteSession)
], debug=True)
