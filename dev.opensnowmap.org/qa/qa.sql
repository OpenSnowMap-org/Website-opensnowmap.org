--~ Find ways intersecting a site convex_hull but not member

select ways.id, relations.id from ways, relations, relation_members
where 
ways.id not in (select member_id from relation_members where relation_id = relations.id )
and
st_intersects(ways.linestring, relations.geom)
and 
relations.id=3545276
group by relations.id, ways.id;

3.9s

explain analyse
select ways.id, relations.id from ways, relations, relation_members
where 
ways.id not in (select member_id from relation_members where relation_id = relations.id )
and
st_intersects(ways.linestring, relations.geom)
group by relations.id, ways.id;





--~ Find route relation member without tag

select ways.id, relation_members.relation_id from ways, relation_members, relations
where
not ways.tags ? "piste:type"
and
ways.id in (select member_id from relation_members)
and



select relations_id , member_id from relation_members
where
