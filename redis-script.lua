local totalHits = redis.call("INCR", KEYS[1])
local timeToExpire = redis.call("PTTL", KEYS[1])
if timeToExpire <= 0 or ARGV[1] == "1" then
  redis.call("PEXPIRE", KEYS[1], tonumber(ARGV[2]))
  timeToExpire = tonumber(ARGV[2])
end
return { totalHits, timeToExpire }
