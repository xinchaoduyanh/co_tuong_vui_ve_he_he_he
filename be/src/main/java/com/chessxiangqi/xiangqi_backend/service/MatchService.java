package com.chessxiangqi.xiangqi_backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.Match;
import com.chessxiangqi.xiangqi_backend.repository.MatchRepository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MatchService {
    @Autowired
    private MatchRepository matchRepository;

    public List<Match> getAllMatches() {
        return matchRepository.findAll();
    }

    public Optional<Match> getMatchById(String matchId) {
        return matchRepository.findById(matchId);
    }

    public Match createMatch(Match match) {
        log.info("Creating new match between {} and {}", match.getPlayer1().getId(), match.getPlayer2().getId());
        return matchRepository.save(match);
    }

    public Match updateMatch(String id, Match match) {
        match.setId(id);
        return matchRepository.save(match);
    }

    public void deleteMatch(String id) {
        matchRepository.deleteById(id);
    }

    public void updateMatchResult(String matchId, String result) {
        Optional<Match> matchOpt = getMatchById(matchId);
        if (matchOpt.isPresent()) {
            Match match = matchOpt.get();
            match.setResult(result);
            match.setEndDate(new java.util.Date());
            matchRepository.save(match);
        } else {
            throw new RuntimeException("Match not found");
        }
    }

    public Match updateMatchResult(Match match) {
        match.setResult("FINISHED");
        match.setEndDate(new java.util.Date());
        matchRepository.save(match);
        return match;
    }

 
} 