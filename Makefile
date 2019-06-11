name    := members
runtime := nodejs8.10
build   := $(shell git describe --tags --always)

all: .docker/$(build) package-lock.json

.docker:
	mkdir -p $@

.docker/%: package.json | .docker
	docker build \
	--build-arg RUNTIME=$(runtime) \
	--iidfile $@ \
	--tag boston-dsa/$(name):$* .

package-lock.json: .docker/$(build)
	docker run --rm $(shell cat $<) cat /var/task/$@ > $@

.PHONY: apply clean

apply:
	echo TODO

clean:
	-docker image rm -f $(shell sed G .docker/*)
	-rm -rf .docker build dist node_modules
