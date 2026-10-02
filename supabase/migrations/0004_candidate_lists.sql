alter table candidates
  add column is_coffee_chat boolean not null default false,
  add column is_rush_candidate boolean not null default false;

-- Every existing candidate today came from coffee chats
update candidates set is_coffee_chat = true;
