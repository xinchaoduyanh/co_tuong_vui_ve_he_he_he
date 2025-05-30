package com.chessxiangqi.xiangqi_backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.Tournament;
import com.chessxiangqi.xiangqi_backend.repository.TournamentRepository;

@Service
public class TournamentService {
    @Autowired
    private TournamentRepository tournamentRepository;

    public List<Tournament> getAllTournaments() {
        return tournamentRepository.findAll();
    }

    public Optional<Tournament> getTournamentById(String id) {
        return tournamentRepository.findById(id);
    }

    public Tournament createTournament(Tournament tournament) {
        return tournamentRepository.save(tournament);
    }

    public Tournament updateTournament(String id, Tournament tournament) {
        tournament.setId(id);
        return tournamentRepository.save(tournament);
    }

    public void deleteTournament(String id) {
        tournamentRepository.deleteById(id);
    }
} 