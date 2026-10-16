package com.chessxiangqi.xiangqi_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableScheduling
public class XiangqiBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(XiangqiBackendApplication.class, args);
	}

}
