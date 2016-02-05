#!/usr/bin/python
#~ for f in *.json; do cat $f | python -mjson.tool; done

import os
import json
import pdb



path = os.path.abspath(__file__)
files = [f for f in os.listdir('.') if os.path.isfile(f)]

cat=''
fil = open('en.json','r')
en = json.load(fil)
KEYS = en.keys()

for f in files:
	
	if f.find('json') != -1:
		filename=os.path.basename(f)
		print f
		fil = open(f,'r')
		
		langdict=json.load(fil)
		for k in langdict.keys():
			if k not in KEYS:
				print k + ' not in en.json !'
				pdb.set_trace()
				exit(0)
		for k in KEYS :
			if k not in langdict.keys():
				print k + ' not in '+ filename
				exit(0)
		fil.seek(0)
		content = fil.readlines()
		content=('').join(content)
		cat += 'var '+f.split('.')[0]+' = '+content

outjs=open('translations.js','w')
outjs.write('// DO NOT EDIT. FILE GENERATED AUTOMATICALLY\n')
outjs.write(cat)
outjs.close()
