#!/usr/bin/python

import psycopg2
import pdb
import sys, os, re
from lxml import etree
import json
import cgi
import urllib

import math
from cStringIO import StringIO

con = psycopg2.connect("dbname=pistes-pgsnapshot-tmp user=admin")
cur = con.cursor()

sql="""
select id, coalesce(tags->'name') from relations where tags->'type'='site';
"""
cur.execute(sql)
sites=cur.fetchall()
l=len(sites)
result={}
for site in sites:
	i=str(long(site[0]))
	name=site[1]
	sql="""
	select ways.id from ways, relations, relation_members
	where 
	ways.id not in (select member_id from relation_members where relation_id = %s )
	and
	ways.id not in (select member_id from relation_members where relation_id in 
						(select member_id from relation_members where relation_id = %s)
					)
	and
	st_intersects(ways.linestring, relations.geom)
	and 
	relations.id=%s
	group by relations.id, ways.id;
	"""
	
	cur.execute(sql % (i,i,i))
	ways=cur.fetchall()
	if len(ways)>0:
		ways=[str(long(w[0])) for w in ways]
		print l, i, ways
		result[i]={}
		result[i]['name']=name
		result[i]['ways']=ways
	l-=1
f=open('result.json','w')
f.write(json.dumps(result, sort_keys=True, indent=4))
f.close()
con.close()
